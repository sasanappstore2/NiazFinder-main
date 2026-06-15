# Test Expansion ? Phase 39 (`intake-quality-v2`)

## Scope

| # | Deliverable |
|---|-------------|
| 39.1 | 40 step-view contract checks ? `test:intake-step-views` |
| 39.2 | 20 hook logic checks + mock fetch ? `test:intake-hooks` |
| 39.3 | Golden matrix +50 scenarios (estate/vehicle/job slices) |
| 39.4 | 100k subset default 7,500 rows |
| 39.5 | `post-golden-{estate,vehicle,job}-matrix.ts` |
| 39.6 | `post-golden-production-regression.ts` (anonymized) |
| 39.7 | `flaky-test-quarantine.json` + baseline skip |
| 39.8 | `report:intake-coverage` (60% file target) |
| 39.9 | `smoke:intake-precommit` (< 60s) |
| 39.10 | Release tag `intake-quality-v2` |

## Commands

```bash
npm run test:intake-step-views
npm run test:intake-hooks
npm run test:intake-quality-v2-smoke
npm run test:post-pipeline          # 215+ scenarios
npm run report:intake-coverage
npm run smoke:intake-precommit
npm run verify:intake-phase -- --phase 39
```

## Flaky quarantine

Heavy gates listed in `scripts/ci/flaky-test-quarantine.json` are skipped in `test:intake-baseline` unless:

```bash
RUN_QUARANTINED_TESTS=true npm run test:intake-baseline
```

## Pre-commit hook (optional)

```bash
# .git/hooks/pre-commit
npm run smoke:intake-precommit
```
