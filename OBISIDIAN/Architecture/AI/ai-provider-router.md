---
title: "Architecture: AI Provider Router"
tags: [architecture, ai]
status: live
---

# AI Provider Router (`src/ai/`)

## هدف
لایهٔ انتزاع چندارائه‌دهنده برای LLM — مسیریابی بین ارائه‌دهنده‌های مختلف (Gemini، مدل محلی، ...)، شامل harness ارزیابی.

## زیرساختار
`src/ai/{types, config, providers, tests, observability, schema, prompts, evaluation, services, analytics, router}` — این ماژول از `src/lib/ai-agent/` و `src/intake/` **جداست**؛ زیرساخت مشترکی است که هر دو می‌توانند از آن استفاده کنند اما خودش منطق دامنه ندارد.

## روابط
- مصرف‌کنندهٔ احتمالی: [[intake-hybrid-rules-llm|Architecture/AI/intake-hybrid-rules-llm]]، [[ai-agent-assistant|Architecture/AI/ai-agent-assistant]]

## فرضیه
جزئیات دقیق routing logic (کدام provider کی انتخاب می‌شود) در این جلسه از کد استخراج نشد — نیاز به بررسی مستقیم `src/ai/router/`.
