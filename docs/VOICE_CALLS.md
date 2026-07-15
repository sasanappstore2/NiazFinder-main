# تماس صوتی (P2P WebRTC)

## پیش‌نیاز

- Communication Gateway: `mini-services/chat-service` (پورت ۳۰۰۴) — `npm run dev:chat`
- `NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:3004`
- `npx prisma migrate deploy` برای فیلدهای `VoiceCall` (`signalingOffer`, `signalingAnswer`)

## معماری

**سرور منبع حقیقت است** — هر تغییر وضعیت (پذیرش، رد، لغو، قطع) از `PATCH /api/calls/[id]` انجام می‌شود. سرور از Redis/HTTP به طرف مقابل fanout می‌کند. کلاینت رویدادهای Socket.io (`call:invite`, `call:accepted`, `call:hangup`, …) را در `useVoiceCallSignaling` گوش می‌دهد — **بدون polling**.

```mermaid
sequenceDiagram
  participant Caller
  participant API
  participant ChatSvc
  participant Callee

  Caller->>API: POST /calls
  Caller->>API: POST /calls/id/invite (SDP)
  API->>ChatSvc: call:invite fanout
  ChatSvc->>Callee: call:invite

  Callee->>API: PATCH accept + sdpAnswer
  API->>ChatSvc: call:accepted fanout
  ChatSvc->>Caller: call:accepted
  Caller->>API: GET /calls/id/answer (poll fallback)

  Caller->>API: PATCH cancel
  API->>ChatSvc: call:hangup fanout
  ChatSvc->>Callee: call:hangup
```

## Janus + coturn (اختیاری — مسیر جدا)

```bash
cp .env.voice.example .env.voice
docker compose -f docker-compose.voice.yml --env-file .env.voice up -d
```

- TURNS روی پورت **443 TCP**
- `GET /api/voice/credentials` — Janus room metadata + ICE (مسیر اختیاری SFU؛ **SoT overlay نیست**)
- Overlay اصلی: `call-controller` + `/api/calls` + `useVoiceCallSignaling` (`use-voice-call.ts`)
- `useVoiceCall.ts` — legacy helper برای credentials؛ media همچنان P2P است

## Env

| متغیر | توضیح |
|--------|--------|
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | Socket.io chat-service |
| `REDIS_URL` | fanout production (اختیاری local — HTTP mirror هم هست) |
| `NEXT_PUBLIC_JANUS_WS_URL` | Janus WebSocket (اختیاری SFU) |
| `NEXT_PUBLIC_VOICE_RELAY_ONLY` | `true` — `buildIceServersFromEnv` فقط TURN (بدون STUN) و `RTCPeerConnection.iceTransportPolicy='relay'` در `call-controller` — مناسب ISP ایران |

## API

| Route | توضیح |
|-------|--------|
| `POST /api/calls` | ایجاد تماس `RINGING` |
| `POST /api/calls/[id]/invite` | ذخیره SDP offer + fanout `call:invite` |
| `GET /api/calls/[id]/offer` | SDP offer (callee) |
| `GET /api/calls/[id]/answer` | SDP answer (caller، وقتی ACTIVE) |
| `GET /api/calls/[id]` | وضعیت تماس |
| `PATCH /api/calls/[id]` | `{ action: 'accept' \| 'reject' \| 'cancel' \| 'end', sdpAnswer? }` |

### PATCH actions

| action | چه کسی | وضعیت قبل | نتیجه |
|--------|--------|-----------|--------|
| `accept` | callee | RINGING | ACTIVE + `call:accepted` → caller |
| `reject` | callee | RINGING | REJECTED + `call:reject` → caller |
| `cancel` | caller | RINGING | ENDED + `call:hangup` → callee |
| `end` | هر دو | ACTIVE | ENDED + `call:hangup` → peer |

تماس فقط بین کاربرانی که **Conversation** مشترک دارند.

## Socket events (از chat-service)

| Event | جهت | منبع |
|-------|-----|------|
| `call:invite` | server → callee | POST invite fanout |
| `call:accepted` | server → caller | PATCH accept fanout |
| `call:reject` | server → caller | PATCH reject fanout |
| `call:hangup` | server → peer | PATCH cancel/end fanout |
| `call:ice-candidate` | peer relay | socket (WebRTC trickle) |
| `call:accept` | legacy | backward compat |

## کلاینت

- `GlobalVoiceCallLayer` — mount در `layout.tsx`
- `call-controller.ts` — state machine + WebRTC
- `useVoiceCallSignaling` — socket listeners برای تماس ورودی/خروجی
- `VoiceCallOverlay` — UI بنر/تمام‌صفحه

## تست

```bash
npx prisma migrate deploy
npx tsx scripts/test-voice-call-e2e.ts
```

## چک‌لیست QA (دو مرورگر / دو کاربر)

| سناریو | انتظار |
|--------|--------|
| تماس خروجی | زنگ → callee بنر → accept → صدا دوطرفه |
| رد تماس | callee رد → caller ≤۲s ساکت + toast |
| لغو تماس‌گیرنده | caller قطع در ringing → callee ≤۲s ساکت |
| chat-service خاموش | poll-only: reject/cancel/accept هنوز کار کند (ICE کندتر) |
| بدون گفتگو مشترک | 403 از POST /calls |
