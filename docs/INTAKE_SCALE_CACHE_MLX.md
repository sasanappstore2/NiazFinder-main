# Intake Scale ? Cache & MLX Cluster (Phase 47)

**Tag:** `intake-scale-v1`  
**Prerequisite:** `intake-queue-v1` (`phase46Complete`)

## Overview

Phase 47 adds Redis-backed analyze cache, MLX instance load balancing, adapter A/B, inference cost metrics, and Redis memory monitoring.

## Parse cache (47.1?47.2)

- **Store:** Redis key `intake:parse:{hash}` with in-memory fallback
- **TTL:** 15 minutes (`NEED_INTAKE_PARSE_CACHE_TTL_MS`)
- **Key:** `sha256(version + text + city hints)` where version = `v{schemaVersion}-{bump}`

Wired in `runIntakeAnalyzeJob` ? cache hit returns immediately with `cacheHit` metric.

## MLX cluster (47.3?47.5)

| Feature | Env | Default |
|---------|-----|---------|
| 2-instance LB | `NEED_INTAKE_LLM_URL`, `NEED_INTAKE_LLM_URL_2` | round-robin |
| Multi URL list | `NEED_INTAKE_LLM_URLS` | comma-separated |
| Hot-swap | `POST /admin/reload` on intake-mlx | model + adapter |
| A/B adapter | `INTAKE_MLX_AB_VARIANT=a\|b` | `a` = active, `b` = candidate |

## Metrics (47.6?47.7)

`recordMlxInferenceMetric` tracks latency + estimated USD cost per call.  
**KPI:** cached analyze p99 < **3000ms**.

## Schema invalidation (47.8)

Bump `INTAKE_PARSE_CACHE_VERSION_BUMP` or increase `NEED_DRAFT_SCHEMA_VERSION` to invalidate all keys.

## Redis memory (47.9)

`GET /api/super-admin/intake-scale` returns Redis memory + `intake:parse:*` key count.

## Phase checklist

| # | Item | Location |
|---|------|----------|
| 47.1 | Redis parse cache | `intake-parse-cache-store.ts` |
| 47.2 | hash(text+version) key | `intake-parse-cache-key.ts` |
| 47.3 | MLX 2-instance LB | `intake-mlx-cluster-lb.ts` |
| 47.4 | model hot-swap | `intake-mlx-hot-swap.ts` + MLX `/admin/reload` |
| 47.5 | adapter A/B | `intake-mlx-adapter-ab.ts` |
| 47.6 | cost per inference | `intake-mlx-inference-metrics.ts` |
| 47.7 | p99 < 3s cached | release + self-test |
| 47.8 | invalidate on schema bump | `intake-parse-cache-policy.ts` |
| 47.9 | Redis memory monitor | `intake-redis-memory-monitor.ts` |
| 47.10 | tag `intake-scale-v1` | `intake-scale-release.ts` |

## Verify

```bash
npx tsc --noEmit
npm run test:intake-scale
npm run verify:intake-phase -- --phase 47
```
