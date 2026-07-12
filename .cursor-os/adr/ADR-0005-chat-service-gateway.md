---
title: "ADR-0005: Dedicated Socket.io chat-service gateway"
date: 2026-07-12
status: accepted
supersedes: []
superseded_by: null
---

# ADR-0005: Dedicated Socket.io chat-service gateway

## Context

Realtime messaging needs a long-lived process. The repo provides `mini-services/chat-service` (Bun/Socket.io) on port **3004**, composed by default. Nest chat namespace exists only as a legacy bridge flag.

## Decision

1. Primary realtime gateway is **chat-service** (`NEXT_PUBLIC_CHAT_SOCKET_URL`, default `http://localhost:3004`, path `/socket.io`).
2. Persistence remains in Postgres via app/chat domain models.
3. Internal secrets protect server-to-server calls.
4. Socket may be disabled (`off` / unset modes per config) without blocking core HTTP app.
5. Nest namespace only when explicitly enabled — not default.

## Consequences

### Positive

- Clear process boundary; healthcheck on `:3004`
- App degrades without realtime

### Negative / risks

- Two processes to run in some dev setups
- Misconfigured URL → “chat broken” confusion

### Rollback

Disable socket URL; use HTTP message paths if available.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Next.js server WebSocket only | Operational coupling; already have service |
| Nest gateway as default | Conflicts with ADR-0003 |

## Implementation notes

- `src/lib/chat-socket-config.ts`
- `mini-services/chat-service/`
- docker service `chat`

## Validation

- Health endpoint; communication e2e / append-order tests when touching protocol
