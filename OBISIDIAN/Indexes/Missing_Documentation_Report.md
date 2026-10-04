---
title: "Missing Documentation Report"
tags: [index]
status: live
---

# Missing Documentation Report

## گپ‌های معماری (به ترتیب اولویت)
۱. `src/lib/need-intake/` (۱۷۴ فایل) — بزرگ‌ترین gap؛ فقط خلاصه پوشش یافت.
۲. `src/lib/filing/` + `filing-scrapers/` (۱۳۶ فایل مجموع) — کاملاً پوشش‌نیافته.
۳. `src/lib/analytics/`, `voice/`, `calendar/`, `seo/` — سند مستقل ندارند.

## سؤالات باز که به تصمیم انسانی نیاز دارند
۱. **وضعیت `chat-go`** — [[../ADR/010-websocket-realtime-strategy|ADR-010]] بدون این پاسخ نمی‌تواند از proposed به accepted برود.
۲. **سرنوشت `need-intake.backup.20260711/`** — حذف یا مستندسازی دلیل نگهداری؟
۳. **`RegisterForm.tsx`/`/register`** — کد مرده باقی مانده؛ حذف یا اتصال به `register-phone`؟
۴. **تناقض شماره‌گذاری ADR-004 در `docs/adr/`** — نیاز به تصمیم دربارهٔ نام‌گذاری صحیح (خارج از scope این کار).
۵. **`estate-scrape/`** — Docker profile دقیقش تأیید نشد.

## اسناد ناقص (نیاز به تکمیل، نه از صفر)
- `Security/README.md` — اسکلت است، نه حسابرسی کامل امنیتی.
- `Performance/README.md`, `Research/README.md` — فقط یافته‌های شناخته‌شدهٔ پراکنده، نه بررسی سیستماتیک.

## توصیه
اولویت فاز بعدی: (۱) پاسخ به ۵ سؤال باز بالا با تیم، (۲) سند معماری برای `need-intake/` و `filing/`.

## روابط
- [[Knowledge_Coverage_Report|Knowledge_Coverage_Report.md]]
- [[Future_Maintenance_Recommendations|Future_Maintenance_Recommendations.md]]
