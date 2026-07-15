# سیستم ارتباط (چت، فایل، تماس)

## معماری

- **REST (Next.js):** `/api/chat/*` — persist + Redis fanout (**منبع حقیقت پیام**)
- **Realtime:** `mini-services/chat-service` (:3004) — Socket.io، JWT `auth.token`
- **Redis:** channel `comm:events` — `message:new`, typing, reactions, `conversation:deleted`, …
- **Media:** MinIO (optional) یا `public/uploads/chat/`
- **Voice:** P2P WebRTC via `/api/calls` + optional Janus/coturn (`docker-compose.voice.yml`)

Canonical product notes also live in [VOICE_CALLS.md](./VOICE_CALLS.md) and [CHAT_QA_CHECKLIST.md](./CHAT_QA_CHECKLIST.md).
Obsidian index: `OBISIDIAN/01_Features/Chat.md` → **this file is SoT**; Obsidian may lag.

## Env

| متغیر | توضیح |
|--------|--------|
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | **Dev:** `http://localhost:3004` (بدون این، realtime خاموش است) یا `off` |
| `CHAT_SERVICE_INTERNAL_URL` | `http://127.0.0.1:3004` — fanout HTTP از Next |
| `REDIS_URL` | `redis://localhost:6379` — fanout + Socket.io adapter |
| `INTERNAL_API_SECRET` / `CHAT_INTERNAL_SECRET` | محافظت `/internal/fanout` |
| `CHAT_CORS_ORIGINS` | comma-separated origins برای Socket.io (prod)؛ dev پیش‌فرض `*` |
| `CHAT_SOCKET_GATEWAY_ENABLED` | Nest chat socket (پیش‌فرض: خاموش — استفاده نکنید) |
| `MINIO_*` | endpoint, keys, bucket — آپلود امن |
| `NEXT_PUBLIC_JANUS_WS_URL` | Janus WebSocket (اختیاری SFU) |
| `NEXT_PUBLIC_VOICE_RELAY_ONLY` | `true` → ICE relay-only (ISP ایران) |
| `PUSH_NOTIFICATIONS_ENABLED` | `true` → enqueue push (با احترام به mute) |

## Dev checklist

```bash
docker compose up -d postgres redis
# optional voice: docker compose -f docker-compose.voice.yml up -d
npm run dev:chat   # :3004
npm run dev        # Next :3000
```

در `.env.local` حتماً بگذارید:

```
NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:3004
REDIS_URL=redis://localhost:6379
```

بدون socket URL در development، typing / read receipt / live delivery کار نمی‌کنند (فقط polling).

Prod CORS:

```
CHAT_CORS_ORIGINS=https://niazfinder.example,https://www.niazfinder.example
```

## Socket events (فرانت)

- `message:new`, `typing`, `message:read-receipt`, `message:react`, `message:star`
- `conversation:deleted` / `conversation:removed`
- تماس P2P: `call:invite`, `call:accepted`, `call:reject`, `call:hangup`, `call:ice-candidate`

## API

- `GET/POST /api/chat` — لیست / ساخت گفتگو
- `GET/POST/DELETE /api/chat/[conversationId]` — پیام‌ها / حذف گفتگو
- `GET/PATCH /api/chat/[conversationId]/mute` — mute persistence
- `POST/DELETE /api/chat/messages/[id]/star`
- `POST /api/chat/messages/[id]/react` (socket echo هم دارد)
- `POST /api/chat/attachment`
- `GET/POST /api/chat/templates` — reply templates
- `GET /api/voice/credentials?conversationId=`
- `POST/PATCH /api/calls…` — voice signaling
- `POST/DELETE /api/users/block`

### Deprecated

- `POST /api/conversations` and `POST /api/conversations/[id]` → **410 Gone** — use `/api/chat`
- GET `/api/conversations*` may remain with `Deprecation` headers
- Socket `message:send` → rejected (`SOCKET_SEND_DEPRECATED`) — use REST send
- Nest `CHAT_SOCKET_GATEWAY_ENABLED` — keep **off**

## E2E smoke

```bash
npm run test:communication-e2e
npm run test:chat-socket-integration   # needs npm run dev:chat
npm run test:message-actions
npm run test:chat-ui-layout
npm run smoke:chat-attachment-mime
npm run test:voice-call-e2e
```

Manual checklist: [CHAT_QA_CHECKLIST.md](./CHAT_QA_CHECKLIST.md)
