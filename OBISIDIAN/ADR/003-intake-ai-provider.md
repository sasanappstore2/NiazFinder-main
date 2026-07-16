---
title: "ADR-003: IntakeAiProvider Facade"
tags: [adr, ai]
status: accepted
---

# ADR-003: IntakeAiProvider — facade واحد analyze

**وضعیت**: پذیرفته‌شده · **دامنه**: `POST /api/intake/analyze` · وابسته به [[001-hybrid-need-intake|ADR-001]]

## خلاصه
سه پیاده‌سازی موازی برای route تحلیل (`analyzeNeedTextViaQwen`, `analyzeNeedTextAsync`, `analyzeNeedText`) وجود داشت و merge/انتخاب env پیچیده بود. تصمیم: یک facade واحد (`IntakeAiProvider`) که انتخاب provider را پشت یک API پنهان می‌کند.

> فایل منبع در `docs/adr/` دارای مشکل encoding است — این خلاصه بر پایهٔ بخش‌های خوانا نوشته شده.

## منبع کامل
[docs/adr/003-intake-ai-provider.md](../../docs/adr/003-intake-ai-provider.md)

## روابط
- [[../Architecture/AI/ai-provider-router|Architecture/AI/ai-provider-router]]
