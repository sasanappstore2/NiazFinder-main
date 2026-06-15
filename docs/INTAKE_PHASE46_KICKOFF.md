# Phase 46 ? Queue Architecture

**Prerequisite:** Phase 45 (`phase45Complete`)

## Scope (10 items)

| # | Item |
|---|------|
| 46.1 | job: `intake.analyze` |
| 46.2 | job: `intake.listing-copy` |
| 46.3 | worker service |
| 46.4 | API enqueue + poll/SSE |
| 46.5 | idempotency key |
| 46.6 | dead letter queue |
| 46.7 | priority paid user |
| 46.8 | load test 200 job/min |
| 46.9 | runbook queue |
| 46.10 | fallback sync |

## Verify

```bash
npx tsc --noEmit
npm run test:intake-queue
npm run verify:intake-phase -- --phase 46
```

## Next

**Phase 47 ? Cache & MLX Cluster** (`INTAKE_PHASE47_KICKOFF.md`)
