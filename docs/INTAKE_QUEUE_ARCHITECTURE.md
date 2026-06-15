# Intake Queue Architecture (Phase 46)

**Tag:** `intake-queue-v1`  
**Prerequisite:** `intake-quality-gate-v1` (`phase45Complete`)

## Overview

Heavy intake work (`intake.analyze`, `intake.listing-copy`) can run asynchronously via BullMQ workers in the Nest backend, with Next.js APIs for enqueue, poll, and SSE.

## Job types

| Job | Queue | Worker |
|-----|-------|--------|
| `intake.analyze` | `intake-analyze` | `IntakeAnalyzeProcessor` |
| `intake.listing-copy` | `intake-listing-copy` | `IntakeListingCopyProcessor` |

Failed jobs (after retries) move to `intake-dead-letter`.

## API flow

```
Client ? POST /api/need-intake/queue/enqueue
       ? Nest POST /api/intake-queue/enqueue
       ? BullMQ worker ? POST /api/internal/intake-queue/execute
       ? GET /api/need-intake/queue/jobs/:id  (poll)
       ? GET /api/need-intake/queue/jobs/:id/stream  (SSE)
```

## Idempotency (46.5)

Send optional `idempotencyKey` in enqueue body. Server hashes `jobName + payload + key` and deduplicates for 15 minutes.

## Priority (46.7)

Set `paidTier: true` for lower BullMQ priority number (higher precedence). Defaults: paid `1`, free `5`.

## Sync fallback (46.10)

When `INTAKE_QUEUE_ENABLED=false` or Nest is unreachable (and `INTAKE_QUEUE_SYNC_FALLBACK` is on), jobs run inline in Next.js and return `syncFallback: true`.

## Env

| Key | Default | Purpose |
|-----|---------|---------|
| `INTAKE_QUEUE_ENABLED` | `true` | Use BullMQ path |
| `INTAKE_QUEUE_SYNC_FALLBACK` | `true` | Inline fallback |
| `INTAKE_QUEUE_PAID_PRIORITY` | `1` | Paid user priority |
| `INTAKE_QUEUE_DEFAULT_PRIORITY` | `5` | Free user priority |
| `INTAKE_QUEUE_LOAD_TARGET_JOBS_PER_MIN` | `200` | Load target (46.8) |

## Phase checklist

| # | Item | Location |
|---|------|----------|
| 46.1 | `intake.analyze` job | `intake-analyze.processor.ts` |
| 46.2 | `intake.listing-copy` job | `intake-listing-copy.processor.ts` |
| 46.3 | worker service | `mini-services/backend/.../intake-queue/` |
| 46.4 | enqueue + poll/SSE | `src/app/api/need-intake/queue/` |
| 46.5 | idempotency | `intake-queue-idempotency.ts` |
| 46.6 | dead letter queue | `intake-dead-letter.processor.ts` |
| 46.7 | paid priority | `intake-queue-policy.ts` |
| 46.8 | load test 200/min | `intake-queue-load-cases.ts` |
| 46.9 | runbook | `INTAKE_QUEUE_RUNBOOK.md` |
| 46.10 | sync fallback | `intake-queue-sync-fallback.ts` |

## Verify

```bash
npx tsc --noEmit
npm run test:intake-queue
npm run verify:intake-phase -- --phase 46
```
