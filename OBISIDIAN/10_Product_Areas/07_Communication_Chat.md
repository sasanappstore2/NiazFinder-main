---
title: "چت و تماس"
tags: [product-area]
status: partial
---

# چت و تماس

## یک خط

ارتباط امن درون‌سایتی بین کارفرما و کسب‌وکار.

## برای چه کسی

هر دو طرف

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/chat` | لیست |
| `/chat/{id}` | گفتگو |
| `/chat/new` | شروع |

## چه کار می‌کند

- پیام realtime
- typing
- read receipt
- واکنش
- تماس صوتی (WebRTC)

## منطق و قوانین

- بدون tel:/واتساپ عمومی
- شماره فقط بعد login
- چت با requestId زمینه

## ویژگی‌های فعلی

- [x] Socket.io
- [x] VoiceCallOverlay
- [x] ContactActions

## ارتباط با بخش‌های دیگر

[[06_Matching_Leads]]
[[08_Auth_Account]]
[[10_Proposals_Reviews]]

## ایده‌ها / آینده

- [ ] #idea ارسال فایل PDF پیشنهاد
- [ ] #idea چت گروهی پروژه

## پیاده‌سازی

- [[../../docs/CONTACT_JOURNEY.md|docs/CONTACT_JOURNEY.md]]
- [[../../docs/VOICE_CALLS.md|docs/VOICE_CALLS.md]]
- [[../../docs/CHAT_RESPONSIVE.md|docs/CHAT_RESPONSIVE.md]]
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## وضعیت

`partial`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
