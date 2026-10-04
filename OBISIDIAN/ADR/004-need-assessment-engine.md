---
title: "ADR-004: Need Assessment Engine (NAE)"
tags: [adr, ai]
status: accepted
---

# ADR-004: Need Assessment Engine (NAE)

**وضعیت**: پذیرفته‌شده — ۲۰۲۶-۰۶-۰۸

## خلاصه
اعتبارسنجی publish در آن زمان فقط rules-only بود (`getPublishReadiness`) — یعنی «فیلدهای لازم پر شده‌اند؟» را جواب می‌داد ولی نه: هم‌خوانی معنایی (نوع معامله در برابر عنوان، بودجه در برابر نوع معامله)، ابهام مکان، وفاداری آگهی (عنوان کلی، کیفیت توضیح)، یا غنای لازم برای matching. تصمیم: موتوری جدا برای ارزیابی کیفیت معنایی، فراتر از چک‌لیست rules.

## منبع کامل
[docs/adr/004-need-assessment-engine.md](../../docs/adr/004-need-assessment-engine.md)

## روابط
- [[../Architecture/Backend/need-intake-engine|Architecture/Backend/need-intake-engine]]
- [[../Architecture/Backend/smart-matching|Architecture/Backend/smart-matching]] (غنای لازم برای matching)
