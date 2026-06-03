# سیستم ارتباط (چت، فایل، تماس)

## معماری

- **REST (Next.js):** `/api/chat/*` — persist + Redis fanout
- **Realtime:** `mini-services/chat-service` (:3004) — Socket.io، JWT `auth.token`
- **Redis:** channel `comm:events` — `message:new`, typing, reactions
- **Media:** MinIO (optional) یا `public/uploads/chat/`
- **Voice:** Janus audiobridge + coturn TURNS:443 — `docker-compose.voice.yml`

## Env

| متغیر | توضیح |
|--------|--------|
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | `http://localhost:3004` یا `off` |
| `REDIS_URL` | `redis://localhost:6379` — fanout + Socket.io adapter |
| `CHAT_SOCKET_GATEWAY_ENABLED` | Nest chat socket (پیش‌فرض: خاموش) |
| `MINIO_*` | endpoint, keys, bucket — آپلود امن |
| `NEXT_PUBLIC_JANUS_WS_URL` | Janus WebSocket |
| `NEXT_PUBLIC_VOICE_RELAY_ONLY` | `true` برای ISP ایران |

## Dev

```bash
docker compose up -d postgres redis
npm run dev:chat   # :3004
npm run dev        # Next :3000
```

## Socket events (فرانت)

- `message:new`, `typing`, `message:read-receipt`, `message:react`
- تماس P2P: `call:invite`, `call:accept`, …

## API

- `GET/POST /api/chat` — لیست / ساخت گفتگو
- `GET/POST /api/chat/[conversationId]` — پیام‌ها (+ `clientTempId`, `replyToId`)
- `POST /api/chat/attachment`
- `GET /api/voice/credentials?conversationId=`
- `POST/DELETE /api/users/block`
- `POST /api/chat/messages/[id]/react`

`/api/conversations/*` — **deprecated**؛ از `/api/chat` استفاده کنید.

## E2E smoke

```bash
npm run test:communication-e2e
```
