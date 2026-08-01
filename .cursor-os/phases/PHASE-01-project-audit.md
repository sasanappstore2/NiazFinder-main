# PHASE-01 — Project Audit Phase

| | |
|---|---|
| **ID** | PHASE-01 |
| **Slug** | `project-audit` |
| **Status** | in_progress |
| **Domain** | process / architecture |
| **Mission** | `.cursor-os/MISSION.md` |
| **Previous** | PHASE-00 (Engineering OS) |

---

## Goal

Build a **complete picture of the project** before any feature development.

**Cursor must not write product features in this phase.**  
Only scan, inventory, compare SoT vs code, score health, and update memory/docs.

## Requirements

- Zero feature PRs / zero behavior changes except doc/audit artifacts
- All eight deliverables below published under `.cursor-os/audits/`
- Project Health Gate recorded in Mission and enforced in Cursor rule
- Drift Critical items listed with owners; no silent ignore
- Phase 02 forbidden until this phase DoD is complete

## Architecture

This phase does not change runtime architecture. It **documents and scores** it against Mission + Constitution + POST_SYSTEM_REPORT + ADRs/RFCs + code.

## Flow

1. Confirm Phase 00 artifacts exist
2. Run Architecture Inventory scan
3. Build Dependency Graph (NeedDraft spine + services)
4. Dead Code Report
5. Drift Report (most important)
6. Technical Debt Report
7. Risk Map
8. Architecture Score
9. Memory Completeness check
10. Update CURRENT_STATE / NEXT_PHASE / TODO
11. Self-review — still no features

## Risks

- Incomplete scan → false confidence before Phase 02
- Treating chat memory as inventory
- Starting Phase 02 with Critical drift open

## Files

- `.cursor-os/phases/PHASE-01-project-audit.md` (this file; replaces prior sot-constitution slug conceptually)
- `.cursor-os/audits/**` (outputs)
- `.cursor-os/MISSION.md` (Health Gate)
- `.cursor/rules/cursor-os.mdc`
- Memory updates only

## Deliverables (mandatory)

| # | Artifact | Path |
|---|----------|------|
| 1 | Architecture Inventory | `audits/01-ARCHITECTURE-INVENTORY.md` |
| 2 | Dependency Graph | `audits/02-DEPENDENCY-GRAPH.md` |
| 3 | Dead Code Report | `audits/03-DEAD-CODE.md` |
| 4 | Drift Report | `audits/04-DRIFT-REPORT.md` |
| 5 | Technical Debt Report | `audits/05-TECHNICAL-DEBT.md` |
| 6 | Risk Map | `audits/06-RISK-MAP.md` |
| 7 | Architecture Score | `audits/07-ARCHITECTURE-SCORE.md` |
| 8 | Memory Completeness | `audits/08-MEMORY-COMPLETENESS.md` |

## Tasks

- [x] Health Gate section in Mission
- [x] Produce audits 01–08
- [x] Wire rule: no Phase 02 until audit DoD + Health Gate
- [x] Close Critical drift (DR-C1, DR-C2)
- [x] Memory sync
- [x] Self-review

## Tests

- No product code change required
- Optional: `npm run test:post-pipeline` as Health Gate baseline snapshot (record pass/fail in score)
- File existence check for all 8 audit outputs
- `test:intake-merge-policy` recorded OK in Architecture Score

## Rollback

- Delete/revert audit docs only; no runtime rollback

## Definition Of Done

- [x] All 8 audit files exist and are grounded in repo scan (not invented)
- [x] Mission contains **Project Health Gate**
- [x] Cursor rule references Health Gate + Phase 01 no-features
- [x] Drift Report lists Critical/High explicitly (Critical closed)
- [x] Memory Completeness shows every Mission memory file ✓
- [x] `NEXT_PHASE.md` points to PHASE-02 after DoD
- [x] No feature code landed in this phase
- [ ] Optional: full `test:post-pipeline` before entering Phase 02
- [ ] Product acknowledge audit / ADR-0006 (recommended)

## RFC Links

- None for audit-only (ADR-0006 still Draft for Mission governance)

## ADR Links

- ADR-0001 … ADR-0006
- Constitution pack (draft)

## Dependencies

- PHASE-00 Mission + memory + phases index
- `docs/POST_SYSTEM_REPORT.md`
- `docs/engineering-constitution/`
