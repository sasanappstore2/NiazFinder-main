# Intake Queue Runbook (Phase 46.9)

## Quick health

```bash
curl -s http://127.0.0.1:4000/api/health
curl -s -X POST http://localhost:3000/api/need-intake/queue/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"jobName":"intake.analyze","payload":{"text":"???? ???????? ?? ????? ????"}}'
```

## Symptoms

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Enqueue 500, `syncFallback: true` | Nest/Redis down | Check Redis + Nest logs; fallback is expected |
| Jobs stuck `queued` | Worker not running | Restart Nest backend |
| Jobs `dead_letter` | Execute API failing | Check `INTERNAL_API_SECRET`, Next logs |
| Duplicate results | Missing idempotency key | Client should send stable `idempotencyKey` |

## Redis keys

- `intake:job:{jobId}` ? job status/result (TTL 30m)
- `intake:idempotency:{hash}` ? dedup pointer (TTL 30m)

## DLQ inspection

Failed jobs after 3 attempts land in `intake-dead-letter` queue. Check Nest logs for `DLQ intake job`.

## Disable queue (emergency)

```env
INTAKE_QUEUE_ENABLED=false
INTAKE_QUEUE_SYNC_FALLBACK=true
```

All jobs run synchronously in Next.js until queue is restored.

## Load target

Design target: **200 jobs/min** (`INTAKE_QUEUE_LOAD_TARGET_JOBS_PER_MIN`). Scale Nest workers horizontally if sustained load exceeds target.

## Related

- Architecture: `INTAKE_QUEUE_ARCHITECTURE.md`
- Quality gate (publish): `INTAKE_QUALITY_GATE.md`
- Next phase: `INTAKE_PHASE47_KICKOFF.md`
