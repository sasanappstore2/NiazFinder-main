---
title: Health & Smoke Scripts
tags: [operations, health]
---

# Health / smoke scripts

| Script | Command | File |
|--------|---------|------|
| Route smoke | `npm run smoke:routes` | [scripts/health/smoke-routes.ts](../../scripts/health/smoke-routes.ts) |
| API smoke | `npm run smoke:api` | [scripts/health/smoke-api.ts](../../scripts/health/smoke-api.ts) |
| Baseline | `npm run health:baseline` | [scripts/health/collect-baseline.ts](../../scripts/health/collect-baseline.ts) |
| API inventory | `npm run health:inventory` | [scripts/health/api-inventory.ts](../../scripts/health/api-inventory.ts) |
| Full CI-style | `npm run check:all` | [package.json](../../package.json) |

## Env for smoke

- `SMOKE_BASE_URL` — default `http://localhost:3000`

## Related

- [[DebugPlaybook]]
- [[../00_Index/LocalRunbook|LocalRunbook]]
