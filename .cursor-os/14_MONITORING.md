# 14 — Monitoring & Telemetry

## Current truth

Observability is **application-level** (telemetry modules, analytics tables, health endpoints) — not a full Datadog/Prometheus stack in-repo. Do not invent dashboards that are not present.

---

## Health endpoints / checks

| Component | Check |
|-----------|-------|
| Typesense | `/health` (ensure script waits) |
| worker-go | `:8081/health` ok JSON |
| chat-service | `:3004/health` ok JSON |
| Postgres | docker healthcheck `pg_isready` |
| Redis / Rabbit / MinIO | compose healthchecks |
| App routes | `smoke:routes`, `smoke:api` |

---

## Intake telemetry

- Modules under intake telemetry + `smart-intake-telemetry` wiring
- Capture engine mode, gaps, failures — avoid raw secrets
- Tests: `test:intake-telemetry`, `test:post-intake-telemetry`

Admin UI: intake AI evaluation dashboard components exist for config/metrics display.

---

## Analytics

- Prisma analytics session/event/rollups
- Optional Rabbit `analytics.telemetry` routing when enabled
- Business daily analytics model

---

## CCQS / quality gates

CCQS models store replay runs, gate verdicts, alerts — evaluation plane. Use for quality regressions; not a substitute for uptime monitoring.

---

## Logging practices

- Prefer structured context: route, request id if present, profile id
- Do not log full need text with PII at info level in prod paths
- Typesense sync failures: log and continue (fire-and-forget)

---

## Incident playbooks (minimal)

| Symptom | First steps |
|---------|-------------|
| Browse empty | Typesense health → sync → fallback disable test |
| Intake hangs | LLM timeout/gateway → rules-only |
| Chat dead | chat health + socket URL env |
| Matching silent | Rabbit/worker health + queue flags |
| Wallet anomalies | Stop lead sends; audit transactions |

---

## Target state

When real APM/metrics are chosen, document vendors and dashboards here via ADR. Until then: smokes + healthchecks + DB analytics.
