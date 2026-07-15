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
- **بدون اسکرول صفحه:** فقط لیست مکالمات و thread داخل `ScrollArea` اسکرول می‌شوند
- موبایل (`< md` = 768): immersive — بدون Header سایت؛ list ↔ گفتگو با URL (`/chat` / `/chat/[id]`)
- دسکتاپ (`md+`): Header فشرده + split view — لیست `min(380px, 35vw)` + thread
- [`ChatViewportShell`](../src/components/chat/ChatViewportShell.tsx) + `visualViewport` (`--vv-bottom`, `--vv-height`) — bottom-anchored بالای کیبورد؛ `data-vv-kb` برای حذف safe-area هنگام کیبورد
- `(chat)/layout` viewport: `interactiveWidget: 'overlays-content'`
- Composer موبایل: لبه به لبه ستون چت (`+` / متن / mic↔send)؛ بدون فاصلهٔ اضافی بالای کیبورد؛ پیوست = bottom Sheet
- Long-press پیام روی موبایل = [`MessageActionSheet`](../src/components/chat/actions/MessageActionSheet.tsx) (شامل کپی متن)
- Info panel موبایل = تمام‌عرض + safe-area؛ هدر thread (آواتار+نام) قابل‌لمس → info
- Multi-pin bar: `پیام‌های سنجاق‌شده (N تا)` + cycle با tap → scroll + highlight
- FAB ↓ وقتی از انتهای thread دوریم
- Unread divider سبک هنگام باز کردن thread با unread
- Inbox: آیکون mute وقتی `isMuted`

## چک‌لیست QA

| سناریو | انتظار |
|--------|--------|
| موبایل `/chat` | بدون Header سایت؛ لیست ↔ thread؛ دکمه back |
| هدر thread | tap آواتار/نام → info panel |
| Multi-pin | نوار شمارش؛ tap cycle + اسکرول به پیام |
| FAB اسکرول | ↓ وقتی scrolled-up؛ tap → انتها |
| کیبورد iOS/Android | composer بالای کیبورد؛ بدون اسکرول document |
| Composer مینیمال | `+` / متن / mic یا send؛ safe-area |
| Long-press پیام | bottom sheet + کپی متن |
| Forward | برچسب «هدایت‌شده» روی حباب |
| Mute در لیست | آیکون BellOff روی ردیف بی‌صدا |
| Unread divider | «پیام‌های خوانده‌نشده» هنگام باز با unread |
| Info panel | تمام‌عرض موبایل؛ حذف گفتگو → `/chat` |
| دسکتاپ | split ثابت؛ Header visible |
| `/chat` مهمان | `AuthModal` |
| Loading | [`(chat)/loading.tsx`](../src/app/(chat)/loading.tsx) |
