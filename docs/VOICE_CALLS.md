# تماس صوتی WebRTC

## پیش‌نیاز

- سرویس چت Socket.io: `mini-services/chat-service` (پورت ۳۰۰۴)
- در ترمینال جدا: `npm run dev:chat`
- در `.env.local` (اختیاری): `NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:3004`
- `npx prisma db push` برای مدل `VoiceCall`

## Env

| متغیر | توضیح |
|--------|--------|
| `NEXT_PUBLIC_STUN_URLS` | STUN (پیش‌فرض Google) |
| `NEXT_PUBLIC_TURN_URL` | TURN برای NAT موبایل |
| `NEXT_PUBLIC_TURN_USERNAME` | |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | |

## API

- `POST /api/calls` — `{ calleeId, conversationId? }` → `{ callId, iceServers }`
- `GET /api/calls` — تاریخچه
- `PATCH /api/calls/[id]` — `{ action: 'accept' \| 'reject' \| 'end' }`

تماس فقط بین کاربرانی که **Conversation** مشترک دارند.

## Socket events

| Event | جهت |
|-------|-----|
| `call:invite` | caller → callee |
| `call:accept` | callee → caller |
| `call:reject` | either |
| `call:hangup` | either |
| `call:ice-candidate` | both |

## چک‌لیست QA

| سناریو | انتظار |
|--------|--------|
| تماس خروجی | زنگ → accept طرف مقابل → صدا دوطرفه |
| تماس ورودی | overlay incoming؛ accept/reject |
| رد میکروفون | پیام فارسی |
| بدون گفتگو مشترک | 403 از API |
| قطع تماس | `hangupVoiceCall` + PATCH end |
