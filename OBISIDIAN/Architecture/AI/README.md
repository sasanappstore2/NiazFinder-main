---
title: "معماری سیستم‌های AI"
tags: [architecture, ai]
status: live
---

# معماری سیستم‌های AI

## هدف
نیازفایندر چند سیستم AI **مجزا** دارد که نباید با هم اشتباه گرفته شوند — این تفکیک مهم‌ترین نکتهٔ این پوشه است.

## اسناد
| سند | دامنه | نکتهٔ کلیدی |
|-----|-------|-------------|
| [[intake-hybrid-rules-llm\|intake-hybrid-rules-llm.md]] | `src/intake/` | موتور اصلی تحلیل نیاز در `/post` — rules-first، LLM اختیاری |
| [[ai-provider-router\|ai-provider-router.md]] | `src/ai/` | لایهٔ انتزاع چندارائه‌دهنده (multi-provider LLM routing) |
| [[ai-agent-assistant\|ai-agent-assistant.md]] | `src/lib/ai-agent/` | دستیار چت پلتفرم («دستیار نیازفایندر») — کاملاً جدا از `src/intake/` |
| [[rag-grounding\|rag-grounding.md]] | `src/lib/rag/` | Retrieval-Augmented Generation برای پاسخ‌های مبتنی بر داده واقعی |

## ⚠️ هشدار حیاتی (از تجربهٔ این جلسه)
هرگز فرض نکنید «سیستم AI» یکی است. حداقل ۴ زیرسیستم مجزا وجود دارد (جدول بالا) + `mini-services/gemma4-intake`, `mini-services/embed-intake` (سرویس‌های محلی LLM). قبل از هر تغییر روی یک سیستم AI، بررسی کنید که تغییر شما زنجیرهٔ وابستگی سیستم دیگری را نمی‌شکند (مثال واقعی: هنگام حذف پیاده‌سازی تکراری NestJS ai-agent، لازم بود صراحتاً تأیید شود که `/post` (که از `src/intake/` استفاده می‌کند) دست‌نخورده می‌ماند).

## روابط
- محدودیت حیاتی سیستم: [[../../AI/System_Constraints|AI/System_Constraints]]
- ADR های مرتبط: `docs/adr/001-intake-ai-strategy.md`, `docs/adr/003-intake-ai-provider.md` (لینک، نه کپی — [[../../ADR/README|ADR/README]])

## ترتیب خواندن
`intake-hybrid-rules-llm.md` (بزرگ‌ترین سیستم) → `ai-agent-assistant.md` → `ai-provider-router.md` → `rag-grounding.md`.
