---
title: Chat & Messaging
tags: [feature, chat]
---

# Chat & Messaging

چت realtime، اعلان‌ها، و تماس صوتی (WebRTC).

> **SoT:** [`docs/COMMUNICATION.md`](../../docs/COMMUNICATION.md) — این صفحه فقط index است.

## Docs

- [docs/COMMUNICATION.md](../../docs/COMMUNICATION.md) ← canonical
- [docs/CHAT_QA_CHECKLIST.md](../../docs/CHAT_QA_CHECKLIST.md)
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
- Primary shell: `ChatPanel.tsx` (thread/list already split under `thread/`, `ChatComposer`, `ChatInfoPanel`)

## Next API

| Route | File |
|-------|------|
| `/api/chat` | [chat/route.ts](../../src/app/api/chat/route.ts) |
| `/api/chat/.../mute` | mute API |
| `/api/chat/messages/.../star` | star API |
| `/api/conversations` | **deprecated** (POST → 410) |
| `/api/calls` | [calls/route.ts](../../src/app/api/calls/route.ts) |

## Socket

- **Realtime SoT:** [mini-services/chat-service/index.ts](../../mini-services/chat-service/index.ts) (`npm run dev:chat`)
- Client config: [chat-socket-config.ts](../../src/lib/chat-socket-config.ts)
- Nest gateway: keep `CHAT_SOCKET_GATEWAY_ENABLED` off

## Voice / ICE

- Overlay: `call-controller` + `use-voice-call` (P2P)
- Optional Janus creds: `/api/voice/credentials` + `load-voice-credentials.ts`
- [ice-servers.ts](../../src/lib/voice/ice-servers.ts) / [ice-servers-client.ts](../../src/lib/voice/ice-servers-client.ts)
- Iran ISP: `NEXT_PUBLIC_VOICE_RELAY_ONLY=true`

## Related

- [[../02_Technical_Refs/SocketServices|SocketServices]]
- [[AdminModeration]] (chat review in super-admin)
