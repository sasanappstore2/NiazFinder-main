---
title: "ADR — Architecture Decision Records"
tags: [adr, decision]
status: live
---

# ADR — تصمیم‌های معماری

## هدف
ثبت تصمیم‌های بزرگ معماری با Context/Decision/Alternatives/Consequences/Trade-offs/Future considerations.

## ⚠️ منبع اصلی جای دیگری است
مرجع اصلی و اولیهٔ ADR های این پروژه **`docs/adr/`** است (۶ فایل، از قبل نوشته‌شده و نگهداری‌شده). فایل‌های زیر در این پوشه فقط **خلاصهٔ یک‌پاراگرافی + لینک** به سند اصلی‌اند — مطابق تصمیم صریح کاربر: «لینک بده، کپی نکن».

## ADR های موجود (خلاصه، منبع کامل در docs/adr/)
| # | عنوان | خلاصه |
|---|-------|-------|
| [[001-hybrid-need-intake\|001]] | Hybrid Need Intake | ترکیب rule-based + LLM fallback برای پارس نیاز |
| [[002-intake-validation-unified\|002]] | Intake Validation Unified | یکپارچه‌سازی لایهٔ اعتبارسنجی intake |
| [[003-intake-ai-provider\|003]] | Intake AI Provider | انتخاب ارائه‌دهندهٔ LLM برای intake |
| [[004-need-assessment-engine\|004]] | Need Assessment Engine | موتور ارزیابی نیاز |
| [[004b-post-manual-wizard\|004b]] | Post Manual Wizard | ⚠️ در `docs/adr/` این هم شمارهٔ ۰۰۴ دارد (تناقض شماره‌گذاری upstream) — اینجا با پسوند `b` افتراق داده شد تا لینک نشکند |
| [[005-remove-intake-v2-chat\|005]] | Remove Intake V2 Chat | حذف نسخهٔ قدیمی چت-محور intake |

## ADR های جدید (نوشته‌شده در این جلسه — چون در docs/adr وجود نداشتند)
> **برچسب صریح**: این‌ها بر پایهٔ observation کد در تاریخ ۲۰۲۶-۰۷-۱۶ نوشته شده‌اند، نه تاریخچهٔ واقعی تصمیم‌گیری مستندشده. اگر تصمیم واقعی متفاوت بوده، لطفاً اصلاح شود.

| # | عنوان |
|---|-------|
| [[007-prisma-orm-strategy\|007]] | Prisma ORM Strategy |
| [[008-authentication-strategy\|008]] | Authentication Strategy |
| [[009-search-architecture\|009]] | Search Architecture (Typesense) |
| [[010-websocket-realtime-strategy\|010]] | WebSocket / Realtime Strategy |
| [[011-wallet-monetization-strategy\|011]] | Wallet & Monetization Strategy |

## روابط
- تصمیم‌های عملیاتی کوچک‌تر (نه معماری بزرگ): [[../Decision Logs/README|Decision Logs/]]
- پیشنهادهای سیستم‌های آیندهٔ بزرگ: [[../RFC/README|RFC/]]

## ترتیب خواندن
اگر روی intake کار می‌کنید: 001 → 002 → 003 → 004 → 004b → 005. برای سایر دامنه‌ها مستقیم به ADR مرتبط بروید.
