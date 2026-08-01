# Audit 07 — Architecture Score

**Date:** 2026-07-12  
**Phase:** PHASE-01  
**Method:** qualitative rubric grounded in scans + gates (not a marketing score).  
**Scale:** 0–100.

---

## Scores

| Dimension | Score | Rationale |
|-----------|------:|-----------|
| **Architecture** | **86** | Clear NeedDraft spine, ADR-0001, dual-pipeline; weakened by panel complexity + doc drift |
| **Maintainability** | **78** | Strong modules in `src/intake`; giant panel + backup trees + doc sprawl |
| **Coupling** (lower better → inverted to score) | **72** | Hotspots NeedDraft/validator/rules; Typesense decoupled from needs (good) |
| **Test coverage** (process gates, not line %) | **80** | post-pipeline / hybrid golden / merge exist; no full coverage % measured; corpus incomplete |
| **Documentation** | **84** | Mission+Constitution+POST_SYSTEM_REPORT+OS rich; drift Critical items cut score |
| **Risk** | **Low–Med** | Publish deterministic; main risks = drift + unsigned governance + panel loops |

### Rollup

| | |
|--|--:|
| **Overall Architecture Health** | **~81** |
| **Risk label** | **Medium** until DR-C2 closed + ADR-0006 accepted → then **Low–Med** |

---

## Baseline tests (Health Gate sample)

| Gate | Result (this audit) |
|------|---------------------|
| `test:intake-merge-policy` | **OK** |
| `test:post-pipeline` | Not re-run full in this pass (record on next Health Gate) |
| `test:hybrid-intake-golden` | Previously 54/54 in audit-loop report — verify before Phase 02 |

---

## Score movers (next)

1. Close DR-C2 doc patches → Architecture/Documentation +3–5  
2. Accept ADR-0006 / Constitution → governance confidence  
3. Slim NeedIntakePanel (RFC) → Maintainability +  
4. Corpus growth → Test coverage +  
