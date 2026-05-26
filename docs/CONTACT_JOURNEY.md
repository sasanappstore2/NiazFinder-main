# سفر ارتباط مشتری ↔ کسب‌وکار

## اصول

- **چت درون‌سایتی**: `POST /api/chat` با `{ otherUserId, requestId? }` → `/chat/{conversationId}`
- **تماس صوتی درون‌سایتی**: `VoiceCallOverlay` (API تماس در حال تکمیل است)
- **شماره تلفن**: فقط پس از ورود، از `GET /api/users/{id}/contact`
- **بدون واتساپ / tel: عمومی** در UI تماس با فروشنده

## کامپوننت‌ها

| فایل | نقش |
|------|-----|
| `ContactActions` | دکمه‌های چت، تماس، پروفایل |
| `start-conversation.ts` | ایجاد گفتگو + redirect |
| `pending-contact` | ادامه پس از ورود (sessionStorage) |

## مسیرهای عمیق

- `/chat/new?userId=…&requestId=…`
- `/pro/{id}?need={requestId}` — چت با زمینه نیاز

## صفحات

- **نیاز** `/v/...`: کسب‌وکارهای پیشنهادی + sticky چت با کارفرما
- **پروفایل** `/pro/...`: ContactActions
- **مرور** `/s/...`: دکمه پیام → چت با همان کاربر

## تست دستی

1. مهمان → چت → مودال ورود
2. ورود → چت از match → گفتگو با `requestId`
3. مالک → پذیرش پیشنهاد → باز شدن چت
4. تماس → overlay (یا پیام به‌زودی)
