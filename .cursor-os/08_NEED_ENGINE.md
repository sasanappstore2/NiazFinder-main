# 08 — Need Engine (Intake)

## Product intent

User writes free Persian text describing a **نیاز**. The engine structures it into category, location, transaction/budget, and vertical fields, then guides gaps until publish.

Entry UX: home hero → `/post` (`NeedIntakePanel` and related components).

---

## Current truth (UX policies)

| Policy | Behavior |
|--------|----------|
| Auto-apply | Background apply of draft fields while composing — user corrects later |
| Category chips / apply | Only if confidence ≥ **0.85** (`UNDERSTANDING_CATEGORY_MIN_CONFIDENCE`) |
| Ambiguous commercial subtype | Do not auto-apply category |
| User locks | Category/location locks prevent overwrite |
| Location ambiguity | Detected in engines; **no dedicated live compose prompt** — resolve on form / later phase RFC |
| Confirmation chips | Not required for high-confidence category auto-apply (do not reintroduce without ADR) |
| Prod LLM | Off per ENV_MAP; local may enable hybrid |

Code anchors:

- `src/components/need-intake/NeedIntakePanel.tsx` — `onDraft` auto-apply
- `src/lib/need-intake/build-intake-understanding.ts` — confidence exports
- `src/intake/rules/config.ts` — thresholds

---

## Pipeline (logical)

```text
1. Compose text (normalize, tokenize)
2. Analyze (rules and/or hybrid AI) → NeedDraft + fieldMeta confidences
3. Auto-apply safe fields to form state
4. Wizard / required fields by category leaf
5. Preview listing title/description (deterministic + optional AI)
6. Publish validator → ServiceRequest (moderation/auto-approve flags)
7. Browse on /n/{city} + matching hooks
```

Supporting modules:

| Concern | Path |
|---------|------|
| Public orchestration | `src/lib/need-intake/` |
| Core engine | `src/intake/` |
| Intelligence / hybrid | `src/intake/intelligence-engine/` |
| Smart extractor | `src/intake/smart-extractor/` |
| UI | `src/components/need-intake/` |
| Hooks/stores | `src/hooks/`, `src/stores/` (intake-related) |
| API | `src/app/api/**` intake / post / analyze routes |

---

## Draft merge & locks

Merge policy self-tests protect against stale races and dual-pipeline overwrites (`test:intake-merge-policy`). Recent audit loop closed P0 merge/stale issues — do not regress.

Rules of thumb:

- User explicit edits win
- High-confidence rule fields resist low-confidence AI clobber
- Category lock + location locks honored

---

## Publish & parity

Publish must keep:

- Validator readiness
- Browse parity (preview vs published filters)
- Shadow publish tests where applicable

Scripts: `test:publish-validator`, `test:publish-browse-parity`, `test:shadow-publish`, `test:preview-browse-parity`.

Auto-approve of requests: `NEED_INTAKE_AUTO_APPROVE` / `NEED_AUTO_APPROVE_REQUESTS` via `auto-approve-policy.ts` — env gated; do not hardcode prod auto-approve.

---

## Telemetry

Smart intake telemetry modules record engine mode, failures, gap prompts. Keep events privacy-safe (no secrets). Tests: `test:intake-telemetry`, `test:post-intake-telemetry`.

---

## Training & schema evolution

- Training capture flywheel under `src/intake/training/`
- Schema evolution proposals: **human review only** (no auto-apply)

---

## Verticals

Estate is the densest pack. Vehicles, jobs/services have dedicated self-tests. Expanding a vertical = packs + required fields + scenarios + publish rules (see `05_RULE_ENGINE.md`).

---

## Legal fixtures / connectors

Stress scripts may use Divar-**style** titles or cached fixtures. Treat as **legal data connector / synthetic corpus** — see `01_SYSTEM_RULES.md`. Do not wire illegal scrape into production publish path.

---

## Debugging checklist

1. Which analyze API did `/post` call?
2. `meta.engine` / analysisMode rules vs ai
3. fieldMeta confidences for category leaf
4. Locks / ambiguous commercial guard
5. Env: `RULES_ONLY`, `HYBRID`, `LLM_ENABLED`
6. Compare against golden/scenario fixtures

---

## Anti-patterns

- Painting category at confidence 0.6 “to help the user”
- Skipping publish validator in smoke demos left in tree
- Editing `intake.backup.*` instead of live `src/intake`
- Assuming Nest intake endpoints
