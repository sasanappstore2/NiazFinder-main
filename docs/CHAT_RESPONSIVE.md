# چت ریسپانسیو

## سرویس realtime

چت زنده و تماس به **سرویس جدا** وصل می‌شود (پورت ۳۰۰۴):

```bash
npm run dev:chat
```

در `.env.local` (اختیاری):

```
NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:3004
```

بدون این سرویس، پیام‌ها از REST (`/api/chat`) کار می‌کنند؛ فقط realtime و تماس WebRTC قطع است.

## معماری

- مسیر `/chat` داخل [`AppShell`](../src/components/layout/AppShell.tsx) با `minimalChrome`
- موبایل (`< md`): لیست ↔ گفتگو با URL (`/chat` / `/chat/[id]`)
- دسکتاپ: split view — لیست `min(380px, 35vw)` + thread
- Composer با `safe-area-inset-bottom` و `Textarea` auto-grow

## چک‌لیست QA

| سناریو | انتظار |
|--------|--------|
| موبایل `/chat` | لیست ↔ thread؛ دکمه back به `/chat` |
| Composer موبایل | بالای safe-area؛ بدون پوشیده شدن توسط home indicator |
| دسکتاپ | split ثابت؛ resize پنجره بدون overflow |
| `/chat` مهمان | `AuthModal` باز می‌شود |
| Info panel | دکمه info در header گفتگو |
| گفتگوی جدید | FAB / دیالوگ جستجوی کاربر |
| Reply موبایل | action sheet (نه hover) |
| Loading | [`(chat)/loading.tsx`](../src/app/(chat)/loading.tsx) — موبایل تک‌پنجره، دسکتاپ split |
