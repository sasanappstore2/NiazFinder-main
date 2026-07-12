# Audit 05 — Technical Debt Report

**Date:** 2026-07-12  
**Phase:** PHASE-01

---

## Critical

| Item | Cause | Risk | Fix proposal | Priority |
|------|-------|------|--------------|----------|
| Doc drift: live ambiguity prompts in OS | Docs not updated after UX removal | Agents re-add broken UX | Patch OS docs (DR-C2) | P0 |
| Dual SoT ADR homes without sync ritual | Historical docs + Cursor OS | Conflicting edits | Single index + cross-links | P0 |

## High

| Item | Cause | Risk | Fix proposal | Priority |
|------|-------|------|--------------|----------|
| `NeedIntakePanel` complexity | Many concerns in one file | Loops, regressions | Slim via RFC (not drive-by) | P1 |
| Backup trees in `src/` | Safety copies | Import confusion, bundle noise | Relocate/archive RFC | P1 |
| Ambiguity helper coupled to unused UI module | Incomplete cleanup | Dead imports / confusion | Split `hasCategoryAmbiguity` | P1 |
| Constitution / ADR-0006 unsigned | Process lag | Unclear authority | Sign or waive | P1 |
| Prompt modules not version-registry | Organic growth | Mega-prompt risk | Phase 14 | P1 |
| Corpus ≪ 1000 RE | Early golden sets | Silent quality drift | Phases 17–18 | P1 |

## Medium

| Item | Cause | Risk | Fix proposal | Priority |
|------|-------|------|--------------|----------|
| `/post/edit` deferred | Product deferral | Broken user expectation | Rebuild or hide links | P2 |
| Nest still in repo | Migration incomplete | Wrong API additions | ADR-0003 discipline + lint deny | P2 |
| Typesense empty-city docs | Data quality | Weak browse filters | Profile data hygiene | P2 |
| Queue + sync fallback complexity | Dev convenience | Prod surprise | Cutover RFC-0003 | P2 |

## Low

| Item | Cause | Risk | Fix proposal | Priority |
|------|-------|------|--------------|----------|
| Naming `/post/[id]` social | Route reuse | Dev confusion | Rename route long-term | P3 |
| Many INTAKE_* docs overlapping Constitution | History | Duplicate truth | Point to Constitution/Mission | P3 |
| No knip/ts-prune in CI | Never added | Unknown dead exports | Add in tooling phase | P3 |

---

## Explicit non-debt (by design)

- Rules-first publish  
- Typesense without neighborhoods  
- Smart-extract proposal-only  
- Compose auto-apply ≥0.85 without confirmation chips  
