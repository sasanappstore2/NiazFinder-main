# PHASE-04 — Confidence & understanding UX

| | |
|---|---|
| **ID** | PHASE-04 |
| **Slug** | `confidence-ux` |
| **Status** | planned |
| **Domain** | intake |
| **Mission** | `.cursor-os/MISSION.md` |

---

## Goal

Preserve ≥0.85 category gate; no low-conf chips; understanding-first compose.

## Requirements

- Obey Source of Truth order (POST_SYSTEM_REPORT → Constitution → RFC → ADR → … → code).
- Do not bypass Rule Engine, NeedDraft, publishValidator, or merge policy.
- Presentation must not call LLM clients.
- Complete this phase fully before PHASE-05.

## Architecture

- Align with memory `ARCHITECTURE.md` and layers L1–L6.
- LLM assistive only; Rule Engine authoritative on conflict.
- Typesense = search only (if this phase touches search).

## Flow

1. Boot memory + ADRs + related RFC
2. Update/create RFC if scope is architectural
3. Implement minimal change set
4. Run required tests
5. Update documentation + memory (`CURRENT_STATE`, `DONE`, `TODO`)
6. Self-review checklist (Mission Continuous Self Review)

## Risks

- Context drift from chat memory
- Scope creep into later phases
- Weakening publish determinism
- Doc/code divergence

## Files (touch set — refine in RFC)

- `.cursor-os/memory/*`
- `docs/POST_SYSTEM_REPORT.md` (if `/post` behavior changes)
- Domain code under `src/intake/**`, `src/lib/need-intake/**`, `src/app/api/**` as applicable

## Tasks

- [ ] Confirm prior phase DoD complete
- [ ] RFC / ADR as required
- [ ] Implementation (only after review)
- [ ] Tests green
- [ ] Docs + memory updated

## Tests

- `npm run test:post-pipeline` when intake touched
- `npm run test:intake-merge-policy` when merge touched
- `npm run test:publish-validator` when publish touched
- Hybrid/golden/vertical as applicable
- Add regression for any bug fixed

## Rollback

- Feature flags / env first
- Revert PR second
- Restore memory notes of rollback in `KNOWN_ISSUES.md`

## Definition Of Done

- [ ] Goal met without architecture bypass
- [ ] Required tests green
- [ ] Documentation updated
- [ ] Memory (`CURRENT_STATE`, `DONE`, `NEXT_PHASE`) updated
- [ ] Self-review questions answered
- [ ] No unapproved scope from later phases

## RFC Links

- (add when opened)

## ADR Links

- ADR-0001 (rules-first) — always in force for intake
- (add others)

## Dependencies

- PHASE-03 complete
- Mission + CONSTRAINTS obeyed
