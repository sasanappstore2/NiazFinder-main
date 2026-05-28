---
title: Chat & Messaging
tags: [feature, chat]
---

# Chat & Messaging

چت realtime، اعلان‌ها، و تماس صوتی (WebRTC).

## Docs

- [docs/CHAT_RESPONSIVE.md](../../docs/CHAT_RESPONSIVE.md)
- [docs/VOICE_CALLS.md](../../docs/VOICE_CALLS.md)

## UI pages

| Route | Page |
|-------|------|
| `/chat` | [chat/page.tsx](../../src/app/%28chat%29/chat/page.tsx) |
| `/chat/[id]` | [conversation page](../../src/app/%28chat%29/chat/%5BconversationId%5D/page.tsx) |
| `/messages` | redirect → `/chat` ([next.config.ts](../../next.config.ts)) |

## Components

- [src/components/chat/](../../src/components/chat/) — [[../02_Technical_Refs/ComponentsIndex#chat|Components → chat]]

## Next API

| Route | File |
|-------|------|
| `/api/chat` | [chat/route.ts](../../src/app/api/chat/route.ts) |
| `/api/conversations` | [conversations/route.ts](../../src/app/api/conversations/route.ts) |
| `/api/calls` | [calls/route.ts](../../src/app/api/calls/route.ts) |

## Socket config

- Chat (Nest default): [chat-socket-config.ts](../../src/lib/chat-socket-config.ts)
- Standalone service (legacy): [mini-services/chat-service/index.ts](../../mini-services/chat-service/index.ts)

## Voice / ICE

- [ice-servers.ts](../../src/lib/voice/ice-servers.ts)
- [ice-servers-client.ts](../../src/lib/voice/ice-servers-client.ts)

## Related

- [[../02_Technical_Refs/SocketServices|SocketServices]]
- [[AdminModeration]] (chat review in super-admin)
