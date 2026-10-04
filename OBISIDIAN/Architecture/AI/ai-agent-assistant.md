---
title: "Architecture: AI Agent Assistant"
tags: [architecture, ai]
status: live
---

# AI Agent Assistant — «دستیار نیازفایندر» (`src/lib/ai-agent/`)

## هدف
دستیار چت پلتفرم (نه موتور تحلیل نیاز در `/post`) — یک چت‌بات مکالمه‌ای که کاربران می‌توانند مستقیم با آن گفتگو کنند.

## تاریخچهٔ اخیر (Phase 1 بلوغ، ۲۰۲۶-۰۷-۱۶)
پیاده‌سازی تکراری NestJS (`mini-services/backend/src/modules/ai-agent/`) حذف شد — نسخهٔ زندهٔ Next.js (`src/lib/ai-agent/`) تنها مسیر فعال است. تأیید شد که `/post` (که از `src/intake/` استفاده می‌کند) هیچ وابستگی‌ای به این ماژول ندارد.

## فایل‌های کلیدی
- `src/lib/ai-agent/route-handler.ts` — مسیر SSE چت (`fee_deducted → thinking → tool_start → token×N → done`)
- `src/lib/ai-agent/wallet-agent-fee.ts` — کسر فی هر پیام از کیف پول، همان الگوی idempotent lock-check مرجع (`src/lib/smart-matching/wallet-lead-fee.ts`)
- `src/lib/ai-agent/local-handler.ts`
- ⚠️ `gemma4-agent.ts` تنها cross-import واقعی به دامنهٔ intake را دارد: از `local-chat-client.ts`/`local-model-config.ts` در `src/lib/need-intake/` می‌خواند (فقط خواندن) — قبل از تغییر این دو فایل در need-intake، بررسی کنید که ai-agent را نمی‌شکند.

## نقشهٔ راهِ بلوغ (۶ فاز، فاز ۱ تکمیل)
۱) حذف پیادهٔ تکراری NestJS ✅ ۲) مهاجرت به structured function-calling ۳) observability (لاگ ساختاریافته + eval set) ۴) حافظه/خلاصه‌سازی LLM-محور ۵) ابزارهای نوشتاری agentic با تأیید کاربر ۶) کاهش تکیه بر regex intent-router.

## روابط
- کسر فی: [[../Backend/wallet-payments|Architecture/Backend/wallet-payments]]
