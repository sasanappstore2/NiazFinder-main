# Audit 03 — Dead Code Report

**Date:** 2026-07-12  
**Phase:** PHASE-01  
**Note:** “Dead” = not in live `/post` tree or superseded; may still be imported for helpers/tests. Do not delete without RFC.

---

## High confidence unused / backup

| Item | Evidence | Recommendation |
|------|----------|----------------|
| `src/components/need-intake.backup.20260711/**` | Entire backup tree | Keep archived or move out of `src/` via RFC |
| `IntakeAgentVerificationCard` | Not imported by live `NeedIntakePanel`; used with proposal-confirmation | Remove from product path or delete after RFC |
| `IntakeGapClarificationPrompt` | Component exists; not mounted in live panel | Delete or reintroduce only via RFC |
| `IntakeLocationAmbiguityPrompt` | Same | Same |
| `IntakeCategoryAmbiguityPrompt` UI | Prompt UI unused; **`hasCategoryAmbiguity` still imported by `use-intake-draft.ts`** | Split helper from UI component |
| `use-intake-proposal-confirmation` | Only tied to verification card path | Quarantine with verification card |

## Possibly stale / legacy

| Item | Notes |
|------|-------|
| `/post/edit/[id]` | Deferred redirect — not a working edit flow |
| Nest `mini-services/backend` | Legacy profile — not dead, but not SoT for new APIs |
| `src/intake.backup.20260711/**` | Backup engine tree |
| Some `need-intake` API routes (`parse-intent`, older paths) | Still present; confirm callers before removal |

## Interfaces / enums

Full unused-symbol scan not run (would need knip/ts-prune CI). **Recommendation for Phase 02+:** add `knip` or `ts-prune` job; do not mass-delete in Phase 01.

## Self-tests referencing ambiguity

- `run-smart-location-ambiguity-self-test.ts` — tests logic, OK to keep
- Confidence fixtures may reference ambiguity concepts — not dead

---

## Action policy

Phase 01: **report only** (+ doc drift fixes).  
Deletion/quarantine = later phase with RFC + tests green.
