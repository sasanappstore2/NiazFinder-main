---
title: "تطبیق و لید"
tags: [product-area]
status: live
---

# تطبیق و لید

## یک خط

پس از publish نیاز، کسب‌وکارهای مرتبط مطلع می‌شوند.

## برای چه کسی

کسب‌وکار

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/api/business/leads` | لیدها |
| `need card در چت` | زمینه نیاز |

## چه کار می‌کند

- امتیاز تطبیق
- سقف روزانه outreach
- پیام intro + کارت نیاز در چت

## منطق و قوانین

- LEAD_MIN_MATCH_SCORE
- LEAD_OUTREACH_DAILY_CAP
- NeedLeadOutreach model

## ویژگی‌های فعلی

- [x] dispatch admin
- [x] match score FA reason

## ارتباط با بخش‌های دیگر

[[02_Need_Intake]]
[[05_Business_Profile]]
[[07_Communication_Chat]]
[[14_Notifications_Referral]]

## ایده‌ها / آینده

- [ ] #idea لید real-time push
- [ ] #idea پرداخت برای لید برتر

## پیاده‌سازی

- [[../../docs/AI_LEAD_OUTREACH.md|docs/AI_LEAD_OUTREACH.md]]
- [[../../docs/NEED_MATCH.md|docs/NEED_MATCH.md]]
- [[../../docs/HOME_LEAD.md|docs/HOME_LEAD.md]]
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## پیاده‌سازی فنی (فایل‌ها و مسیرها)

*(merge شده از `01_Features/LeadOutreach.md`)*

| نوع | مسیر |
|-----|------|
| Config | `.env.example` (`LEAD_*`), `src/lib/need-leads/env.ts`, `src/lib/smart-matching/env.ts` (`STANDARD_LEAD_FEE_TOMAN`, `QUALITY_LEAD_FEE_TOMAN`) |
| API | `src/app/api/admin/need-leads/dispatch/route.ts`, `src/app/api/business/leads/route.ts` |
| هستهٔ ارسال + کسر فی | `src/lib/smart-matching/send-vip-lead.ts`, `wallet-lead-fee.ts` |
| Prisma | `NeedLeadOutreach` (شامل `leadFeeAmount`, `feeDeductedAt`, `walletTransactionId`) |

> فی لید از ۲۰۲۶-۰۷-۱۶ دو سطحی شد (عادی/باکیفیت) — به [[11_Wallet_Payments]] مراجعه کن.

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
