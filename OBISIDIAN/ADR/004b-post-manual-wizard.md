---
title: "ADR-004b: Post v2 Manual Wizard (AI Deferred)"
tags: [adr]
status: accepted
---

# ADR-004b: Post v2 — manual wizard (AI deferred)

**وضعیت**: پذیرفته‌شده — ۲۰۲۶-۰۶

> ⚠️ در `docs/adr/` این فایل هم شمارهٔ ۰۰۴ دارد (تناقض شماره‌گذاری upstream، دو فایل مجزا هر دو `004-*.md`) — در این Vault با پسوند `b` افتراق داده شد تا لینک‌ها نشکنند. اصلاح شماره‌گذاری در `docs/adr/` خودش خارج از scope این کار است.

## خلاصه
جریان `/post` قبلاً به MLX/Qwen وابسته بود (analyze، assessment، SSE listing copy). artifact های آموزشی و coupling زمان اجرا هزینهٔ عملیاتی را بدون تضمین پایدار UX بالا برده بود. تصمیم:
1. یک ویزارد سه‌مرحله‌ای کاملاً دستی: متن نیاز → دسته/مکان/جزئیات → پیش‌نمایش قالب → publish.
2. حذف runtime MLX از ریپو (`mini-services/intake-mlx`، اسکریپت‌های train، روت‌های AI API).
3. نگه‌داشتن پایدار قراردادهای `NeedDraft` و `POST /api/need-intake/publish` برای رفتار AI آینده پشت feature flag.

## منبع کامل
[docs/adr/004-post-manual-wizard.md](../../docs/adr/004-post-manual-wizard.md)

## روابط
- [[../Architecture/Backend/need-intake-engine|Architecture/Backend/need-intake-engine]]
