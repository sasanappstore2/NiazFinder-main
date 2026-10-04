---
title: Socket & Realtime Services
tags: [technical, websocket]
---

# Socket.io services

## 1) NestJS gateways (default in dev)

| Gateway | Namespace / path | Entry |
|---------|------------------|-------|
| Chat | `/chat` (per gateway config) | [chat.gateway.ts](../../mini-services/backend/src/gateways/chat.gateway.ts) |
| Notifications | notifications gateway | [notifications.gateway.ts](../../mini-services/backend/src/gateways/notifications.gateway.ts) |
| Intake typing | `/intake-typing` | [intake-typing module](../../mini-services/backend/src/modules/intake-typing/) |

**Port:** 4000 (see [main.ts](../../mini-services/backend/src/main.ts))

### Frontend config

| Feature | Config file | Env |
|---------|-------------|-----|
| Chat | [chat-socket-config.ts](../../src/lib/chat-socket-config.ts) | `NEXT_PUBLIC_CHAT_SOCKET_URL` |
| Typing | [typing-socket-config.ts](../../src/lib/typing-socket-config.ts) | `NEXT_PUBLIC_TYPING_WS_URL` |

Set to `off` to disable WS.

## 2) Standalone chat service (legacy / optional)

| Item | Path |
|------|------|
| Entry | [mini-services/chat-service/index.ts](../../mini-services/chat-service/index.ts) |
| Port | 3004 |
| Rooms | `user:{userId}`, `conv:{conversationId}` |
| Events | `message:send`, `typing`, `message:read`, `call:*` |

## Redis (Nest)

Required for cache, BullMQ, WS scaling in staging/prod.

- [redis.module.ts](../../mini-services/backend/src/common/redis/redis.module.ts)

## Related

- [[../../10_Product_Areas/07_Communication_Chat|Chat]]
- [[../../10_Product_Areas/02_Need_Intake|TypingAnalysisRealtime]]
- [[NestBackendModules]]
