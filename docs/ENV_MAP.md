# Environment variable map

## Need intake — production launch (rules-only)

| Variable | Production | Staging | Local dev |
|----------|------------|---------|-----------|
| `NEED_INTAKE_LLM_ENABLED` | **`false`** | **`false`** | `true` (optional MLX) |
| `NEED_INTAKE_TITLE_AI_ENABLED` | **`false`** | `false` | optional |

Production `/post` uses **`intake-rules`** engine only. Qwen/MLX is for local evaluation and post-launch experiments.

## Need intake — local LLM gateway (LM Studio)

| Variable | Purpose |
|----------|---------|
| `LOCAL_LLM_ONLY` | `true` (default) — force all AI through local OpenAI-compatible gateway |
| `NEED_INTAKE_LLM_URL` | LM Studio server base (`http://127.0.0.1:1234`) |
| `NEED_INTAKE_LLM_MODEL` | Model id from LM Studio (`gemma-4-E2B_q4_0-it.gguf`) |
| `LOCAL_LLM_PARALLEL_SLOTS` | Max concurrent client requests (default `4`, match LM Studio Parallel Requests) |
| `NEED_INTAKE_HYBRID_ENABLED` | Enable AI→Rules→AI hybrid cascade |
| `NEED_INTAKE_PARSE_CACHE_VERSION_BUMP` | Bust intake parse cache when model/logic changes |
| `NEED_INTAKE_LLM_TIMEOUT_MS` | Analyze timeout (recommend `120000` for q4 GGUF) |
| `AGENT_LLM_BASE_URL` / `AGENT_LLM_MODEL` | Platform chat agent — same LM Studio gateway as intake |

Start LM Studio: load `gemma-4-E2B_q4_0-it.gguf`, start server on `:1234`, set Parallel Requests=4.

Verify: `npm run verify:lm-studio-parallel` and `npm run smoke:local-llm-intake`

Legacy sidecar (optional): `npm run dev:gemma4-intake` on `:8100`

## RabbitMQ (event-driven async)

| Variable | Purpose |
|----------|---------|
| `RABBITMQ_URL` | AMQP connection URL (`amqp://user:pass@host:5672/`) |
| `RABBITMQ_ENABLED` | `true` = publish to queues; `false` = sync fallback (analytics only) |
| `RABBITMQ_USER` / `RABBITMQ_PASSWORD` | Broker credentials (Docker default: `niazfinder` / `change_me`) |
| `RABBITMQ_EXCHANGE` | Topic exchange name (default `niazfinder_topic`) |
| `RABBITMQ_DLX` | Dead letter exchange (default `dlx_niazfinder`) |
| `RABBITMQ_DLQ` | Dead letter queue (default `dlq_failed_tasks`) |
| `RABBITMQ_ROUTING_INTAKE` | Routing key for intake AI jobs (default `intake.ai`) |
| `RABBITMQ_ROUTING_ANALYTICS` | Routing key for analytics telemetry (default `analytics.telemetry`) |
| `RABBITMQ_ROUTING_MATCHING` | Routing key for business matching (default `business.match`) |
| `INTAKE_QUEUE` | Intake worker queue (default `intake_ai_processing`) |
| `ANALYTICS_QUEUE` | Analytics worker queue (default `analytics_telemetry`) |
| `MATCHING_QUEUE` | Business matching queue (default `business_matching`) |

When `RABBITMQ_ENABLED=true`, NestJS `enqueueIntakeHeavyJob` is skipped; MLX runs via `worker-go`.

Docker: `docker compose up rabbitmq worker-go` (add `--profile ai` for `gemma4-intake`).

## Typesense (business search)

| Variable | Purpose |
|----------|---------|
| `TYPESENSE_ENABLED` | `true` = use Typesense for `/api/business/browse` |
| `TYPESENSE_API_KEY` | API key (must match docker `--api-key`) |
| `TYPESENSE_HOST` | Host (default `127.0.0.1`) |
| `TYPESENSE_PORT` | Port (default `8108`) |
| `TYPESENSE_PROTOCOL` | `http` or `https` |

Bootstrap index: `npm run sync:typesense`

## Security (required in production)

See `.env.example` for `INTERNAL_API_SECRET`, `CHAT_INTERNAL_SECRET`, `SUPER_ADMIN_PHONES`, etc.

## Verify after deploy

```bash
npm run smoke:routes
npm run smoke:need-intake-home-parse
NEED_INTAKE_LLM_ENABLED=false npm run test:post-estate-scenarios
```

Analyze responses should include `meta.engine: "intake-rules"` when LLM is disabled.
