---
title: "Knowledge Coverage Report"
tags: [index]
status: live
---

# Knowledge Coverage Report

## دامنه‌های با سند معماری اختصاصی
`src/intake/`, `src/lib/smart-matching/`, `src/lib/payment/` + `wallet/` + `referral/`, `src/lib/business/`, `src/lib/chat/` + chat-service, `src/lib/search/`, `src/lib/auth/` + `rbac/`, `src/lib/geo/` + `map/` + `neighborhoods/`, `src/ai/`, `src/lib/ai-agent/`, `src/lib/rag/`, `prisma/schema.prisma` (کل)، `mini-services/` (کل)، `src/components/` (نمای کلی).

## دامنه‌های بزرگ **بدون** سند اختصاصی (شناسایی‌شده، پوشش‌نیافته)
بر اساس نقشهٔ معماری اولیه، این دامنه‌های `src/lib/` سند مستقل نگرفتند (حجم کمتر یا خارج از scope مستقیم کار امروز):
- `src/lib/need-intake/` (۱۷۴ فایل — **بزرگ‌ترین دامنهٔ بدون سند مستقل**؛ بخشی از آن در `Architecture/Backend/need-intake-engine.md` پوشش داده شد اما نه کامل)
- `src/lib/filing/` (۹۹ فایل) و `src/lib/filing-scrapers/` (۳۷ فایل) — کاملاً پوشش‌نیافته
- `src/lib/analytics/` (۱۷ فایل)
- `src/lib/voice/` (۱۶ فایل)
- `src/lib/typing-analysis/` (۱۲ فایل) — به‌صورت خلاصه در `10_Product_Areas/02_Need_Intake.md` پوشش یافت، نه سند مستقل
- `src/lib/calendar/` (۱۴ فایل)
- `src/lib/seo/` (۹ فایل)
- ماژول‌های کوچک (۱-۵ فایل): بیش از ۳۰ زیرپوشهٔ کوچک‌تر، فهرست‌شده در `Architecture/Backend/README.md` اما بدون سند جداگانه

## دلیل انتخاب scope
اولویت با دامنه‌هایی بود که (الف) بزرگ‌ترین حجم کد را دارند، یا (ب) مستقیماً به کار امروز (مدل درآمدی) مرتبط بودند. `filing/`, `filing-scrapers/`, `analytics/`, `voice/` علی‌رغم حجم قابل‌توجه، خارج از این دو معیار افتادند.

## اقدام پیشنهادی
فاز بعدی مستندسازی باید `src/lib/need-intake/` (۱۷۴ فایل) و `src/lib/filing/`+`filing-scrapers/` (۱۳۶ فایل مجموع) را در اولویت بگیرد — بزرگ‌ترین gap های باقی‌مانده.

## روابط
- [[Missing_Documentation_Report|Missing_Documentation_Report.md]]
