# Audit Loop Baseline — Iteration 0

**Date:** 2026-07-12  
**Mode:** Hybrid + Deploy  
**Status:** Baseline captured; Phase 1 P0 in progress

## Gate results

| Suite | Result | Notes |
|-------|--------|-------|
| `test:post-pipeline` | **153/153 OK** | ~1224 assertions |
| `test:post-intake-scenarios` | **OK** | |
| `test:publish-validator` | **4/4 OK** | |
| `test:intelligence-engine` | **OK** | 3 scenarios, AI=false |
| `test:hybrid-intake-golden` | **50/54 (92.6%)** | Passes 85% threshold; target ≥95% |

### Hybrid golden failures (4)

1. `vehicle-motor` — got `vehicles/car`, expected `vehicles/motorcycle`
2. `social-lost` — got empty vertical/slug, expected `social/lost-found`
3. `service-locksmith` — got empty, expected `real-estate/apartment-sale` (fixture mismatch?)
4. `estate-clinic-rent` — got `office-rent`, expected `apartment-rent`

## Live accuracy (existing report)

Source: `reports/intake-live-accuracy-report.json`

| Metric | Value |
|--------|-------|
| Category accuracy | **43.8%** (57/130) |
| City accuracy | 92.3% |
| Neighborhood accuracy | 70.3% |

Weak verticals: personal-items 0/6, services 20/49, jobs 4/10.

## P0 / P1 backlog status at baseline

| ID | Issue | Status |
|----|-------|--------|
| P0-1 | Dual pipeline merge policy | **open** — start WP-1.1 |
| P0-2 | Stale smartResult / abort race | **partial** — abort+_sourceSig exist; formalize + tests |
| P1-1 | smart-extract rate-limit / body cap / useAI default | **open** |
| P1-2 | Neighborhood soft-fill | **open** |
| P1-3 | `area` answered from city alone | **open** (`intake-field-answered.ts:78`) |
| P1-4 | dealType soft-fill → recomputeNeedDraft | **open** |
| P1-5 | BUY/RENT magnitude outside RE | **partial** — gated in smart-extractor |
| P1-6 | billion/million unit detection | **open** |

## Env flags (target hybrid)

| Flag | Desired |
|------|---------|
| `NEED_INTAKE_HYBRID_ENABLED` | true |
| `NEED_INTAKE_LLM_ENABLED` | true |
| `NEED_INTAKE_DISAMBIG_AI_ENABLED` | true |
| `NEED_INTAKE_TRUTH_VERIFY_ENABLED` | true (confidence-gated) |

## Next

WP-1.1 `intake-merge-policy.ts` → WP-1.2 race hardening → Phase 2.
