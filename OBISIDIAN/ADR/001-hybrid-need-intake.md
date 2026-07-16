---
title: "ADR-001: Hybrid Need Intake (Rules-First, AI-Enhance)"
tags: [adr, ai]
status: accepted
---

# ADR-001: Rules-First, AI-Enhance — استراتژی هوش مصنوعی Intake

**وضعیت**: پذیرفته‌شده (۲۰۲۶-۰۶-۰۹، به‌روز ۲۰۲۶-۰۶-۱۶) · **دامنه**: `/post` — analyze، title، listing copy

## خلاصه
مسیر intake سه لایهٔ analyze داشت (MLX، cloud AI، rules) بدون سیاست روشن — رفتار dev/production متفاوت می‌شد و outage سرویس MLX تجربهٔ کاربر را می‌شکست یا publish را غیرقطعی می‌کرد. تصمیم: rules به‌عنوان لایهٔ پیش‌فرض و قطعی، AI فقط برای غنی‌سازی اختیاری.

## منبع کامل
[docs/adr/001-intake-ai-strategy.md](../../docs/adr/001-intake-ai-strategy.md)

## روابط
- [[../Architecture/Backend/need-intake-engine|Architecture/Backend/need-intake-engine]]
- [[../Architecture/AI/intake-hybrid-rules-llm|Architecture/AI/intake-hybrid-rules-llm]]
