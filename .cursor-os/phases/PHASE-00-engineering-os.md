# PHASE-00 — Engineering Operating System

| | |
|---|---|
| **ID** | PHASE-00 |
| **Slug** | `engineering-os` |
| **Status** | in_progress |
| **Domain** | docs / process |
| **Mission** | `.cursor-os/MISSION.md` |

---

## Goal

Establish Mission, memory slots, phase files, SoT boot, and Cursor rules so every later phase inherits anti-drift discipline. **No product feature code in this phase.**

## Requirements

- Obey Source of Truth order (POST_SYSTEM_REPORT → Constitution → RFC → ADR → … → code).
- Do not bypass Rule Engine, NeedDraft, publishValidator, or merge policy.
- Presentation must not call LLM clients.
- Complete this phase fully before PHASE-01.

## Architecture

- Process architecture only: Mission as operating law; memory as durable context; phases as sequential delivery units.
- Align with Constitution roles (architect vs implementer) without inventing new runtime services.

## Flow

1. Author `MISSION.md`
2. Create/complete `.cursor-os/memory/*` slots
3. Author `.cursor-os/phases/PHASE-00..27`
4. Wire `.cursor/rules/cursor-os.mdc` + INDEX/README
5. Draft ADR for Mission governance (review, not silent code)
6. Update CURRENT_STATE / DONE / TODO / NEXT_PHASE
7. Self-review

## Risks

- OS docs diverge from POST_SYSTEM_REPORT
- Over-scoping into Phase 01+ implementation
- Ignoring “code wins” and inventing fake infra

## Files

- `.cursor-os/MISSION.md`
- `.cursor-os/memory/**`
- `.cursor-os/phases/**`
- `.cursor/rules/cursor-os.mdc`
- `.cursor-os/INDEX.md`, `README.md`
- `.cursor-os/adr/ADR-0006-engineering-mission-governance.md` (draft)

## Tasks

- [x] Confirm prior phase DoD complete (N/A — bootstrap)
- [x] Write MISSION.md
- [x] Create memory slots listed in Mission
- [x] Create phase files 00–27
- [x] Wire Cursor rule + INDEX
- [x] ADR-0006 draft
- [x] Memory sync (CURRENT_STATE, DONE, TODO, NEXT_PHASE)
- [x] Self-review

## Tests

- Doc integrity: required memory files exist
- No product code change required for Phase 00 DoD
- Existing intake gates remain green if accidentally touched (should not be)

## Rollback

- Revert Phase 00 doc PRs; restore previous cursor-os.mdc
- Does not affect runtime

## Definition Of Done

- [x] Mission published
- [x] All Mission-listed memory files exist
- [x] 28 phase files + phases/README
- [x] Cursor rule enforces Mission boot + SoT
- [x] INDEX/README/02_MEMORY point to Mission + phases
- [x] ADR-0006 drafted
- [x] CURRENT_STATE notes Phase 00
- [x] Self-review complete (docs-only phase; no product code)
- [ ] ADR-0006 Accepted by product/architect (optional for doc bootstrap; required before Phase 01 architecture work)

## RFC Links

- None required for bootstrap docs (ADR used for governance)

## ADR Links

- ADR-0001 (rules-first) — always in force
- ADR-0006 (draft) — Mission governance

## Dependencies

- None (bootstrap)
- Inputs: `docs/POST_SYSTEM_REPORT.md`, `docs/engineering-constitution/`
