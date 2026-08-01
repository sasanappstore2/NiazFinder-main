# PHASE-01.5 — Architecture Freeze

| | |
|---|---|
| **ID** | PHASE-01.5 |
| **Slug** | `architecture-freeze` |
| **Status** | in_progress |
| **Domain** | governance |
| **Previous** | PHASE-01 Project Audit |
| **Next** | PHASE-02 Knowledge Model (not old “intake-rules-fidelity”) |

---

## Goal

Freeze the **core architecture until v1.0** so agents and humans cannot casually reshape the system mid-flight.

> From this moment, core architecture is frozen until an explicit unfreeze ADR.

**No product feature code in this phase.**

## Requirements

- Publish `ARCHITECTURE_FREEZE_v1.md` with principles, immutable decisions, boundaries, future ideas, out of scope, metrics, exit criteria
- Publish `RED_LINES.md`
- Publish `phases/SEQUENCE.md` (canonical order)
- Wire Mission + Cursor rule + Health Gate to require Freeze compliance
- Update memory (CURRENT_STATE, NEXT_PHASE, DECISIONS, TODO, DONE)
- Do **not** start Phase 02 until this DoD is complete

## Architecture

Governance-only. Runtime code unchanged except forbidden.

## Flow

1. Author Freeze v1 + Red Lines + Sequence
2. Wire discovery (Mission, rule, INDEX/README pointers)
3. Memory sync
4. Self-review against Red Lines (meta)
5. Stop — await human ACK before Phase 02

## Risks

- Freeze ignored by agents → restate in alwaysApply rule
- Premature Phase 02 → Health Gate block
- Over-freezing prevents needed bugfixes — bugfixes that don’t change architecture remain allowed (Mission)

## Files

- `.cursor-os/ARCHITECTURE_FREEZE_v1.md`
- `.cursor-os/RED_LINES.md`
- `.cursor-os/phases/PHASE-01.5-architecture-freeze.md`
- `.cursor-os/phases/SEQUENCE.md`
- `.cursor-os/MISSION.md`
- `.cursor/rules/cursor-os.mdc`

## Tasks

- [x] Architecture Freeze document
- [x] Red Lines
- [x] Sequence + phase file
- [x] Mission / rule / memory wire-up
- [x] Retarget PHASE-02..05
- [x] Self-review

## Tests

- File existence of Freeze + Red Lines + Sequence
- No product behavior change

## Rollback

- Revert freeze docs only (does not un-audit Phase 01)

## Definition Of Done

- [x] `ARCHITECTURE_FREEZE_v1.md` complete
- [x] `RED_LINES.md` complete
- [x] Mission references Freeze + Red Lines + Health Gate updated for 01.5
- [x] Cursor rule rejects Freeze violations
- [x] NEXT_PHASE = Phase 02 Knowledge Model only after 01.5 DoD
- [x] No feature code
- [x] Memory updated
- [x] Human ACK of Freeze (confirmed 2026-07-12)
- [x] Knowledge Model Charter drafted (pre–Phase 02)
- [ ] Charter Approved (blocks Phase 02 code)

## RFC Links

- Unfreeze later: new RFC/ADR only

## ADR Links

- ADR-0001 … ADR-0006
- Future: “Amend Architecture Freeze v1” if needed

## Dependencies

- Phase 01 audit artifacts (Critical drift closed)
- Mission Phase 0
