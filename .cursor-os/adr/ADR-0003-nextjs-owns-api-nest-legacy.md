---
title: "ADR-0003: Next.js owns the API; Nest is legacy"
date: 2026-07-12
status: accepted
supersedes: []
superseded_by: null
---

# ADR-0003: Next.js owns the API; Nest is legacy

## Context

Historically a NestJS service existed under `mini-services/backend`. The product app is Next.js App Router with a large `src/app/api/**/route.ts` surface. Docker compose places Nest under profile `legacy` with old frontend/caddy.

## Decision

1. **All new HTTP product APIs** go in Next.js route handlers.
2. Nest backend is **legacy** — maintenance/hotfix only; no new feature home.
3. Chat realtime remains the dedicated `chat-service` (Bun/Socket.io), not Nest, unless explicitly bridging with documented flags.
4. Worker concerns stay in `worker-go` + RabbitMQ, invoked from Next domain code as needed.

## Consequences

### Positive

- Single primary backend mental model
- Shared types/libs with UI
- Legacy isolated behind profile

### Negative / risks

- Temptation to “just add Nest endpoint” for familiarity
- Dual stacks until legacy fully retired

### Rollback

Only via superseding ADR + RFC to re-split services — not ad hoc.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Nest as primary API | Diverges from current codebase gravity |
| Move chat into Next server | Separate process already exists and scales independently |

## Implementation notes

- `CLAUDE.md`, `03_ARCHITECTURE.md`, docker `legacy` profile
- Chat: `src/lib/chat-socket-config.ts`, `mini-services/chat-service`

## Validation

- New features land under `src/app/api`
- Legacy profile not required for default `docker compose up`
