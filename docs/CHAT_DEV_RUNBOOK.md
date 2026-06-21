# Chat Dev Runbook

راهنمای اجرای محلی سیستم چت، تماس صوتی و realtime.

## معماری کوتاه

| مسیر | پروتکل | توضیح |
|------|--------|--------|
| ارسال پیام | HTTP `POST /api/chat/:id` | optimistic در Zustand + persist در DB |
| دریافت realtime | Socket.io (`chat-service`) | roomهای `conv:{id}` و `user:{id}` |
| fanout | Redis pub/sub یا HTTP `/internal/fanout` | بعد از POST موفق |
| fallback | polling هر ۱۰s | وقتی socket قطع است (`useChatPollingFallback`) |

## پیش‌نیازها

```bash
# ترمینال ۱ — Next.js
npm run dev

# ترمینال ۲ — chat-service (پورت 3004)
npm run dev:chat
```

متغیرهای `.env` (حداقل یکی از دو مورد fanout):

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://127.0.0.1:6379
# یا در نبود Redis:
INTERNAL_API_SECRET=your-secret

NEXT_PUBLIC_CHAT_SOCKET_URL=http://127.0.0.1:3004
CHAT_SERVICE_INTERNAL_URL=http://127.0.0.1:3004
```

## Health check

```bash
curl -s http://127.0.0.1:3004/health
# {"ok":true,...}
```

بدون `dev:chat`: ارسال HTTP کار می‌کند؛ دریافت live و تماس صوتی قطع می‌شود — polling fallback باید پیام‌ها را ≤۱۵s نشان دهد.

## Smoke test

```bash
npm run test:communication-e2e
```

نیاز: `DATABASE_URL`؛ اختیاری `REDIS_URL` و chat-service برای fanout.

## Manual QA checklist

- [ ] `/chat` → انتخاب گفتگو → ارسال متن (بدون refresh)
- [ ] `/chat/[id]` deep-link مستقیم — موبایل 375px: thread + composer visible
- [ ] شروع چت از پروفایل کسب‌وکار / پروفایل کاربر
- [ ] forward پیام به گفتگوی دیگر
- [ ] تماس صوتی invite (socket connected)
- [ ] dev بدون `dev:chat` → polling fallback پیام جدید را نشان می‌دهد
- [ ] logout بعد از 401 — modal ورود و عدم ارسال silent fail

## عیب‌یابی

| علامت | علت محتمل | اقدام |
|-------|-----------|--------|
| POST 201 ولی peer پیام live نمی‌بیند | fanout قطع | `REDIS_URL` یا `INTERNAL_API_SECRET` + `dev:chat` |
| همه آفلاین / تماس «کاربر آفلاین» | presence زنده قطع | `npm run dev:chat` + `CHAT_SERVICE_INTERNAL_URL`؛ API تماس از `/presence` chat-service استفاده می‌کند |
| موبایل thread خالی تا refresh | conv در store نیست | GET messages باید `conversation` برگرداند؛ deep-link با `threadActive` |
| send گیر کرده | timeout | `isSendingMessage` با finally + 30s guard |
| forward fail با socket down | مسیر socket-only | `ForwardMessageDialog` از `store.sendMessage` (HTTP) |

## فایل‌های کلیدی

- UI: `src/components/chat/ChatPanel.tsx`
- Store: `src/lib/store.ts` — `sendMessage`, `fetchConversationMessages`, `addOrUpdateConversation`
- Socket client: `src/lib/chat-socket.ts`, `src/lib/chat/socket-bridge.ts`
- Polling: `src/hooks/useChatPollingFallback.ts`
- API: `src/app/api/chat/[conversationId]/route.ts`
- Realtime service: `mini-services/chat-service/index.ts`
