---
title: "API — Hub"
tags: [api]
status: live
---

# API

## هدف
نقشهٔ ۲۱۶ روت `src/app/api/**` به تفکیک ناحیه — بدون تکرار کاتالوگ کامل موجود.

## گروه‌بندی (تعداد تقریبی route)
| گروه | تعداد | نکته |
|------|-------|------|
| `super-admin/**` | ۹۸ | بزرگ‌ترین گروه؛ ۳۳ زیرناحیه (analytics, rbac, wallets, referrals, ...) |
| `business/**` | ۴۰ | leads, private-leads, occupations, online-stores |
| `chat/**` | ۱۳ | |
| `auth/**` | ۸ | شامل `register-phone` (مسیر واقعی ثبت‌نام) |
| `need-intake/**` | ۹ | |
| `users/**` | ۹ | |
| `intake/**` | ۶ | |
| `map/**` | ۶ | |
| `calls/**` | ۶ | |
| `wallet/**` | ۳ + `wallet/deposit/{initiate,callback}` | کیف پول + درگاه Zarinpal (۲۰۲۶-۰۷-۱۶) |
| `subscription/**` | ۱ | اشتراک Free/Pro/Business (۲۰۲۶-۰۷-۱۶) |
| `referral/**` | ۱ | |
| سایر (۱-۲ تایی) | — | analytics, blog, bookmarks, calendar, categories, dashboard, need-alerts, notifications, push, reviews, telemetry, voice, ai |

## روابط
- کاتالوگ کامل خط‌به‌خط (بازنویسی نشده): [[../90_Technical_Appendix/Index/APIRoutesCatalogue|90_Technical_Appendix/Index/APIRoutesCatalogue]]
- منطق پشت هر گروه: [[../Architecture/Backend/README|Architecture/Backend/]]

## ترتیب خواندن
جدول بالا برای نمای کلی → کاتالوگ کامل برای route دقیق.
