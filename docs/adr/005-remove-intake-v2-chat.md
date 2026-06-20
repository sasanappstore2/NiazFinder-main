# ADR-005: Remove conversational Intake V2 — canonical `/post` form wizard

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-15 |
| **Scope** | Conversational intake v2 (chat UI, orchestrator, API) |
| **Supersedes** | Frozen `/v2` redirect + 503 `intake-chat` API |

---

## Context

Intake V2 was a conversational chat layer (`IntakeChatV2`, `orchestrateIntakeV2Turn`) built on top of the same `NeedDraft` and category-filter schemas as `/post`. It was frozen earlier: `/v2` redirected to `/post`, and `POST /api/v2/intake-chat` returned 503.

Product direction: **form-oriented need intake** at `/post` — free-text seed + category-specific fields from `category-filters/specs.ts`, not a chat turn loop.

---

## Decision

1. **Delete** the conversational v2 stack:
   - `src/lib/intake-v2/`
   - `src/components/intake-v2/`
   - `src/stores/intake-v2-store.ts`
   - `src/app/(main)/v2/`, `src/app/api/v2/intake-*`
   - `scripts/v2-conv-qa/`, v2 CI workflows, npm scripts

2. **Archive** golden conversation fixtures to `archive/intake-v2-golden/` (reference only; no runner).

3. **Keep** `/v2` → `/post` redirect in `next.config.ts` for old bookmarks.

4. **Canonical intake** remains:
   - `/post` → `NeedIntakePanel` (4-step wizard)
   - Per-category forms via `getIntakeFieldsForCategory()` + `needTypes` sections
   - Rules-first parse (`intent-parser`, `extract-slots-rules`) for text seeding
   - Publish gate: `validateNeedDraftForPublish`

5. **Not in scope:** `serviceRequestV2.ts`, `NEED_DRAFT_V2.md` (publish API schema v2 — unrelated naming).

---

## Consequences

### Positive

- Single UX path; no duplicate playbook logic (v2 playbooks vs category-filters)
- Smaller codebase; no orphaned chat components or frozen APIs
- Future category work focuses on `category-filters/specs.ts` + `needTypes.ts`

### Negative

- V2-specific coerce/playbook/synonym logic removed; port to `/post` rules only if needed
- Archived golden conversations are not replayable in CI

---

## Follow-up

- Expand per-category form specs in `category-filters/specs.ts` (start with real-estate)
- Add vertical golden matrices per [`INTAKE_ADD_VERTICAL.md`](../INTAKE_ADD_VERTICAL.md)
- Run `npm run test:post-pipeline` as the primary intake gate
