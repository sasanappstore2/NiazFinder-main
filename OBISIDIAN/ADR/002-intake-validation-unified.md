---
title: "ADR-002: Unified Publish Validation"
tags: [adr]
status: accepted
---

# ADR-002: Unified publish validation (`getPublishReadiness`)

**وضعیت**: پذیرفته‌شده

## خلاصه
سه منبع مجزا برای منطق آمادگی publish وجود داشت (`publishValidator.ts` برای gate اصلی، `needSchema.ts`/`completionState` برای progress UI، `intake-shard-status.ts` برای shard bar) که امکان diverge شدن داشتند. تصمیم: یکپارچه‌سازی پشت یک تابع واحد `getPublishReadiness`.

> فایل منبع در `docs/adr/` دارای مشکل encoding (کاراکترهای فارسی به‌صورت `?????` نمایش داده می‌شوند) — این خلاصه بر پایهٔ بخش‌های خوانا (انگلیسی/کد) نوشته شده است.

## منبع کامل
[docs/adr/002-intake-validation-unified.md](../../docs/adr/002-intake-validation-unified.md)

## روابط
- [[../Architecture/Backend/need-intake-engine|Architecture/Backend/need-intake-engine]]
