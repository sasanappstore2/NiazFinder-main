---
title: "Architecture: Chat & Communication"
tags: [architecture, backend, chat]
status: live
---

# Chat & Communication (`src/lib/chat/`, `mini-services/chat-service/`)

## هدف
ارتباط realtime بین کارفرما و کسب‌وکار — پیام، typing، read receipt، واکنش، تماس صوتی WebRTC.

## معماری Realtime
منبع حقیقت سرویس سوکت: `mini-services/chat-service/index.ts` (Bun + Socket.io مستقل، `npm run dev:chat`). یک نسخهٔ Go موازی (`mini-services/chat-go/`) هم در ریپو وجود دارد — **وضعیتش (جایگزین در حال گذار یا آزمایشی؟) در این جلسه تأیید نشد**؛ قبل از هر تصمیم روی این دو، با تیم هماهنگ کنید.

## فایل‌های کلیدی
| نوع | مسیر |
|-----|------|
| UI shell | `src/components/chat/` (`ChatPanel.tsx`, `thread/`, `ChatComposer`, `ChatInfoPanel`) |
| Client socket config | `src/lib/chat-socket-config.ts` |
| API | `src/app/api/chat/route.ts`, `src/app/api/calls/route.ts` |
| صوتی/ICE | `src/lib/voice/ice-servers.ts`, `ice-servers-client.ts` |

## دادهٔ مرتبط
`Conversation`, `Message` (بخش MESSAGES & CHAT در schema).

## روابط
- محصول: [[../../10_Product_Areas/07_Communication_Chat|10_Product_Areas/07_Communication_Chat]]
- استراتژی WebSocket: [[../../ADR/010-websocket-realtime-strategy|ADR/010-websocket-realtime-strategy]]

## منابع کامل (docs/)
- [docs/COMMUNICATION.md](../../../docs/COMMUNICATION.md), [docs/VOICE_CALLS.md](../../../docs/VOICE_CALLS.md), [docs/CHAT_RESPONSIVE.md](../../../docs/CHAT_RESPONSIVE.md)
