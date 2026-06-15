# Intake Telemetry (Phase 36)

First-party analytics for `/post` wizard funnel, analyze latency, and publish outcomes.

## Events

| Event | When |
|-------|------|
| `intake_step_enter` | Wizard step shown (`step` property) |
| `intake_step_exit` | Leaving step (`durationMs`) |
| `intake_wizard_step_*` | Funnel milestones (need ? publish) |
| `intake_publish_success` | Publish OK (`requestId` only) |
| `intake_publish_fail` | Validation or API error |
| `intake_analyze_latency` | After `/api/intake/analyze` |

## Privacy (36.8)

`sanitizeIntakeTelemetryProps()` strips: `needText`, `title`, `description`, `sourceText`, `phone`, `email`, etc.

## Sampling (36.9)

Production default: **10%** (`NEXT_PUBLIC_INTAKE_TELEMETRY_SAMPLE_RATE=0.1`), stable per session.

## Admin dashboard (36.5?36.7)

Super-admin ? Analytics ? tab **/post**:

- Wizard funnel + drop-off KPI (target &lt; 15%)
- Analyze latency avg / P95

API: `GET /api/super-admin/analytics/intake`

Funnel preset: `intake-wizard` in `/api/super-admin/analytics/funnel`

## Verification

```bash
npm run test:intake-telemetry
npm run verify:intake-phase -- --phase 36
```

## Phases 31?36 retro

| Phase | Topic |
|-------|--------|
| 31 | AI provider |
| 32 | Reconcile |
| 33 | Confidence UX |
| 34 | MLX circuit breaker |
| 35 | Title/Copy v2 |
| 36 | Telemetry |
