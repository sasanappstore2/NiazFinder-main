# لید هوشمند (AI Lead Outreach)

پس از **انتشار نیاز**، سیستم کسب‌وکارهای متناسب را پیدا می‌کند و از طرف **هوش مصنوعی نیازفایندر** در چت پیام می‌دهد: متن معرفی + کارت آگهی (`NEED_CARD`).

## جریان

1. `POST /api/need-intake/publish` یا `POST /api/requests`
2. `scheduleNeedLeadOutreach(requestId)` (غیرهم‌زمان)
3. تطبیق rule + LLM re-rank + تأیید LLM دوم
4. برای هر کسب‌وکار واجد شرایط (زیر سقف روزانه): گفتگو با AI + پیام TEXT + NEED_CARD + اعلان `AI_NEED_LEAD`

## متغیرهای محیطی

| Env | پیش‌فرض | معنی |
|-----|---------|------|
| `LEAD_OUTREACH_ENABLED` | true | خاموش با `false` |
| `PLATFORM_AI_USER_ID` | — | شناسه کاربر AI؛ اگر خالی، auto-create |
| `LEAD_MIN_MATCH_SCORE` | 0.65 | حداقل امتیاز تطابق |
| `LEAD_OUTREACH_DAILY_CAP_PER_BUSINESS` | 3 | سقف پیام روزانه per کسب‌وکار |
| `LEAD_OUTREACH_MAX_PER_REQUEST` | 8 | حداکثر کسب‌وکار per نیاز |
| `NEED_LEAD_DISPATCH_SECRET` | — | برای `POST /api/admin/need-leads/dispatch` |
| `NEED_INTAKE_AI_ENABLED` | — | برای qualify و متن معرفی LLM |

## API

| Method | Path | توضیح |
|--------|------|--------|
| GET | `/api/business/leads` | لیدهای ارسال‌شده برای کسب‌وکار واردشده |
| POST | `/api/admin/need-leads/dispatch` | دیباگ دستی (header `x-need-lead-dispatch-secret`) |

## تست دستی (املاک امامت مشهد)

1. کسب‌وکار: پروفایل فعال، شهر مشهد، آدرس/توضیح «خیابان امامت»، دسته املاک، خدمات رهن و اجاره
2. نیاز: «آپارتمان اجاره در محدوده امامت مشهد» + آدرس در فیلد `address`
3. انتشار نیاز → بررسی چت کسب‌وکار با «هوش مصنوعی نیازفایندر»
4. انتظار: پیام فارسی + کارت نیاز قابل کلیک
5. dispatch مجدد همان نیاز → بدون duplicate (`NeedLeadOutreach` unique)
6. بیش از ۳ لید در یک روز → `SKIPPED` / `daily_cap`

## آینده (monetization)

- `BusinessProfile.leadAlertsEnabled` برای opt-in/paid plan
- فیلتر سخت‌تر قبل از ارسال برای پلن رایگان

## فایل‌های کلیدی

- `src/lib/need-leads/*`
- `src/lib/platform-ai/user.ts`
- `src/components/need/NeedLeadCard.tsx`
- `src/components/chat/ChatMessageContent.tsx`
- `prisma/schema.prisma` — `NeedLeadOutreach`, `MessageType.NEED_CARD`
