# Manual chat QA checklist

Run with `npm run dev` + `npm run dev:chat` and `NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:3004`.

| # | Scenario | Path | Pass |
|---|----------|------|------|
| 1 | Send text (optimistic) | REST `POST /api/chat/:id` | |
| 2 | Image / file / voice note | attachment + POST | |
| 3 | Reply / edit / delete / pin | HTTP + socket echo | |
| 4 | Reaction toggle | socket primary | |
| 5 | Read receipt + unread badge | socket | |
| 6 | Block user | info panel | |
| 7 | Delete conversation | DELETE `/api/chat/:id` → URL `/chat` | |
| 8 | Need context banner | conversation with `requestId` | |
| 9 | Platform AI bot stream | `/api/ai/chat` | |
| 10 | Forward message | context menu / sheet | |
| 11 | Reply templates | composer picker | |
| 12 | Star / mute | info panel + context menu | |
| 13 | Voice call invite/accept/hangup + CALL log in thread | `/api/calls` + socket; Janus optional | |
| 14 | Iran relay-only ICE | `NEXT_PUBLIC_VOICE_RELAY_ONLY=true` | |

## Mobile (`< 768`)

| # | Scenario | Expect | Pass |
|---|----------|--------|------|
| M1 | Open `/chat` | No site Header; chat fills viewport | |
| M2 | List ↔ thread | Back returns to list `/chat` | |
| M3 | Soft keyboard (iOS/Android) | Composer stays above keyboard; page does not scroll | |
| M4 | Notch / home indicator | Composer + sheets respect safe-area | |
| M5 | Long-press message | Bottom action sheet | |
| M6 | Attachment | Bottom sheet; keyboard dismisses first | |
| M7 | Info panel | Full-bleed; delete → `/chat` | |
| M8 | iPhone SE / short landscape | No document scroll; scroll inside list/thread only | |
| M9 | Minimized voice call bar | Clears composer height | |
| M10 | Opening a conversation | Keyboard does **not** auto-open | |
| M11 | Header avatar/name tap | Opens info panel | |
| M12 | Multi-pin bar | Shows count; tap cycles pins + scrolls/highlights | |
| M13 | Scroll-to-bottom FAB | Appears when away from bottom; tap jumps to end | |
| M14 | Composer layout | `+` / input / mic↔send (templates hidden on mobile) | |
| M15 | Action sheet copy | Long-press → کپی متن copies body | |
| M16 | Forward chrome | Forwarded bubble shows «هدایت‌شده» | |
| M17 | Unread divider | Opening thread with unread shows divider once | |
| M18 | Muted inbox row | BellOff icon when conversation muted | |

Automated:

```bash
npm run test:communication-e2e
npm run test:chat-socket-integration
npm run test:message-actions
npm run test:chat-ui-layout
npm run test:voice-call-e2e
```
