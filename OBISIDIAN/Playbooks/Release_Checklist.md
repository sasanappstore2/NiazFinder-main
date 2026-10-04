---
title: "Release Checklist"
tags: [operations]
status: live
---

# چک‌لیست انتشار (Release)

- [ ] `npm run check:all` سبز است (prisma validate → tsc → eslint → build → suite های زنجیره‌ای)
- [ ] اگر دامنهٔ intake لمس شده: `test:intake-*` مرتبط اجرا شده
- [ ] اگر کیف پول/پرداخت لمس شده: `test:wallet-api` اجرا شده و الگوی idempotency دستی بررسی شده
- [ ] اگر schema تغییر کرده: migration واقعاً روی دیتابیس staging/production (نه فقط dev) تست شده
- [ ] هیچ کد مرده/فایل بکاپ عمداً باقی نمانده بدون یادداشت دلیل (مثال هشداردهنده: `need-intake.backup.20260711/`)
- [ ] مستندات مرتبط (Architecture/ADR/Decision Log) به‌روز شده‌اند
- [ ] regression دستی: `/post` هنوز کار می‌کند (اگر هر بخشی از intake/AI لمس شده)

## روابط
- [[../Testing/README|Testing/]]
- [[Architecture_Checklist|Architecture_Checklist.md]]
