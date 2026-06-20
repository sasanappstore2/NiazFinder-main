# worker-go

High-performance RabbitMQ consumers for NiazFinder async workloads.

## Queues

| Queue | Routing key | Processor |
|-------|-------------|-----------|
| `intake_ai_processing` | `intake.ai` | MLX analyze + `ServiceRequest` finalize |
| `analytics_telemetry` | `analytics.telemetry` | Batched `AnalyticsEvent` inserts |
| `business_matching` | `business.match` | Topology only (publisher from intake worker) |

Dead letter: `dlx_niazfinder` → `dlq_failed_tasks` (after 3 retries with `x-retry-count` header).

## Environment

See root `.env.example` and `docs/ENV_MAP.md`.

Required: `DATABASE_URL`, `RABBITMQ_URL`

## Run locally

```bash
docker compose up rabbitmq postgres redis
RABBITMQ_ENABLED=true npm run dev   # Next.js producer
cd mini-services/worker-go && go run ./cmd/worker
```

## Health

- `GET :8081/health`
- `GET :8081/metrics` — analytics buffer size
