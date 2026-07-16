---
title: "Architecture: Hybrid Rules+LLM Intake"
tags: [architecture, ai]
status: live
---

# Hybrid Rules+LLM Intake

## هدف
توضیح فلسفهٔ طراحی `src/intake/` از زاویهٔ AI — چرا rules-first و نه صرفاً LLM.

## اصل طراحی
پیش‌فرض سیستم **rules-only** است (`NEED_INTAKE_LLM_ENABLED=false` طبق CLAUDE.md) — LLM محلی (`mini-services/gemma4-intake`) فقط opt-in و به‌عنوان **fallback/تکمیل‌کننده**، نه مسیر اصلی. دلیل: قابل‌پیش‌بینی‌بودن، سرعت، هزینهٔ صفر برای حجم بالا.

## لایهٔ intelligence-engine
`src/intake/intelligence-engine/` (۶۸ فایل) لایهٔ «آشتی‌دهندهٔ حقیقت» (truth reconciliation) بین خروجی rules و خروجی LLM است — وقتی هر دو فعال‌اند، این لایه تصمیم می‌گیرد کدام برنده است. تست‌های طلایی ابهام‌زدایی (`disambiguation golden tests`) اینجا زندگی می‌کنند.

## جزئیات کامل
[[../Backend/need-intake-engine|Architecture/Backend/need-intake-engine]]

## روابط
- تصمیم معماری: `docs/adr/001-intake-ai-strategy.md`, `docs/adr/003-intake-ai-provider.md` (لینک از [[../../ADR/README|ADR/]])
