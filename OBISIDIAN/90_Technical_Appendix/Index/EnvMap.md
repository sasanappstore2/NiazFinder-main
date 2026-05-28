---
title: Environment Map
tags: [index, env]
---

# Environment variables

## مستند کامل

- [docs/ENV_MAP.md](../../docs/ENV_MAP.md) · [open](file:///Users/sasan/Desktop/NiazFinder%20main/docs/ENV_MAP.md)
- نمونه: [.env.example](../../.env.example) · [open](file:///Users/sasan/Desktop/NiazFinder%20main/.env.example)

## خلاصهٔ لوکال (پیشنهادی)

```env
# Next → Nest
NEXT_PUBLIC_API_URL=http://localhost:3000
NEST_API_URL=http://127.0.0.1:4000

# WebSocket (Nest gateways)
NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_TYPING_WS_URL=http://localhost:4000

# Prisma (root app)
DATABASE_URL="file:./db/custom.db"

# Internal
INTERNAL_API_SECRET=...
JWT_SECRET=...   # هم‌خوان با Nest
```

## محل مصرف در کد

| Variable | File |
|----------|------|
| `NEXT_PUBLIC_API_URL` | [api-client.ts](../../src/lib/api-client.ts) |
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | [chat-socket-config.ts](../../src/lib/chat-socket-config.ts) |
| `NEXT_PUBLIC_TYPING_WS_URL` | [typing-socket-config.ts](../../src/lib/typing-socket-config.ts) |
| `NEST_API_URL` | [enqueue-heavy.ts](../../src/lib/need-intake/enqueue-heavy.ts) |
| `NEST_BACKEND_URL` | [enqueue.ts (moderation)](../../src/lib/request-moderation/enqueue.ts) |

## Related

- [[LocalRunbook]]
- [[../03_Operations_Debug/DebugPlaybook|DebugPlaybook]]
