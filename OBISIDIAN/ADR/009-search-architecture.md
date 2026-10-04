---
title: "ADR-009: Search Architecture"
tags: [adr, search]
status: accepted
---

# ADR-009: Search Architecture (Typesense)

> ⚠️ **این ADR بر پایهٔ observation کد در تاریخ ۲۰۲۶-۰۷-۱۶ نوشته شده، نه تاریخچهٔ واقعی مستندشدهٔ تصمیم‌گیری.**

**وضعیت**: پذیرفته‌شده (استنباط‌شده از کد فعلی)

## Context
جستجو/فیلتر نیاز به یک موتور ایندکس سریع، typo-tolerant، و فارسی-سازگار داشت که هم برای نیازها و هم کسب‌وکارها کار کند — و به‌راحتی self-host شود (به‌جای وابستگی به سرویس ابری خارجی که در ایران ممکن است در دسترس نباشد).

## Decision
Typesense به‌عنوان موتور جستجو (سرویس Docker profile `default`)، مصرف‌شده از طریق `src/lib/search/`.

## Alternatives
- **Elasticsearch/OpenSearch**: قوی‌تر ولی سنگین‌تر برای عملیات self-host با تیم کوچک.
- **Postgres full-text search**: هزینهٔ زیرساخت صفر (از دیتابیس موجود استفاده می‌شود) اما typo-tolerance و سرعت ضعیف‌تر برای UX جستجوی فارسی.
- **Algolia/Meilisearch ابری**: وابستگی به دسترسی خارجی، هزینهٔ ارزی.

## Consequences
- نیاز به sync ایندکس Typesense با تغییرات Postgres (نیاز/کسب‌وکار جدید یا ویرایش‌شده) — نقطهٔ احتمالی drift اگر sync شکست بخورد.
- سرویس جداگانه‌ای است که باید در stack محلی/production جدا از Postgres مانیتور شود.

## Trade-offs
سرعت و typo-tolerance بهتر در برابر پیچیدگی عملیاتی نگه‌داشتن یک سرویس ایندکس جدا هم‌گام با دیتابیس اصلی.

## Future considerations
جزئیات دقیق مکانیزم sync (real-time webhook یا batch) در این جلسه از کد استخراج نشد — نیاز به بررسی مستقیم `src/lib/search/` برای تأیید.

## روابط
- [[../Architecture/Backend/search|Architecture/Backend/search]]
