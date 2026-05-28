# API Architecture (Canonical)

This project currently has **two server stacks**:

1. Next.js app routes and route handlers in `src/app/api/**`
2. NestJS service in `mini-services/backend`

To avoid hybrid drift, the canonical app-facing contract is:

- **Frontend -> Next API (`/api/...`)**
- Next API may orchestrate Prisma and optional downstream services

## Boundaries

- `src/components/**`, `src/hooks/**`, and `src/lib/store.ts`
  - must call `/api/...` via `apiFetch` from `src/lib/api-client.ts`
  - must not call backend port `4000` directly

- `src/app/api/**`
  - the stable BFF layer for web/mobile UI
  - owns request/response shape compatibility

- `mini-services/backend`
  - infra and service runtime (queues/realtime/internal jobs)
  - can be consumed by infra or internal bridges, not random UI calls

## Legacy helpers

In `src/lib/api-client.ts`, these helpers are considered compatibility-only:

- `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`
- domain wrappers like `authApi`, `requestsApi`, etc.

They route through Caddy with `XTransformPort=4000` and should not be used by new UI code.

## Migration rule for new features

1. Add/extend a route in `src/app/api/...`
2. Consume it from UI using `apiFetch('/api/...')`
3. Keep backend-only integrations behind server boundaries

