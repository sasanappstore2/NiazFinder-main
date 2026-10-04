---
title: "Cursor Context (کوتاه)"
tags: [ai]
status: live
---

# Cursor Context

نسخهٔ فشردهٔ [[CLAUDE_CONTEXT|CLAUDE_CONTEXT.md]] برای Cursor یا هر ایجنت دیگر با context محدود.

- Next.js 16 + Postgres/pgvector، فرانت/بک در یک اپ Bun.
- `/post` (موتور intake در `src/intake/`) حساس‌ترین بخش — بدون تأیید صریح لمس نشود.
- مدل درآمدی: کاربر عادی هیچ‌وقت پول نمی‌دهد؛ کسب‌وکار برای لید واقعی از طریق Wallet پرداخت می‌کند.
- هر عملیات پولی جدید باید الگوی idempotent lock-check را رعایت کند (مرجع: `src/lib/smart-matching/wallet-lead-fee.ts`).
- `prisma db push` را با احتیاط اجرا کنید — هشدار data-loss را کامل بخوانید قبل از تأیید.
- ۴ سیستم AI مجزا در پروژه هست؛ آن‌ها را قاطی نکنید — [[../Architecture/AI/README|Architecture/AI/]].
- کد سورس را داخل مستندات Obsidian کپی نکنید.

جزئیات کامل: [[CLAUDE_CONTEXT|CLAUDE_CONTEXT.md]] و `CLAUDE.md` ریشهٔ ریپو.
