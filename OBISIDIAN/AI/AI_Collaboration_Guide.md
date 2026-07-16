---
title: "AI Collaboration Guide"
tags: [ai]
status: live
---

# AI Collaboration Guide

راهنمای همکاری با این پروژه — برای هر ایجنت AI که کد یا مستندات این ریپو را تغییر می‌دهد.

## قبل از شروع هر کار
1. [[CLAUDE_CONTEXT|CLAUDE_CONTEXT.md]] را بخوانید.
2. اگر کار روی یک دامنهٔ خاص است، سند معماری مرتبط در [[../Architecture/README|Architecture/]] را بخوانید.
3. برای کارهای بزرگ/چندفایلی، ابتدا کاوش کنید (Explore-style) نه این‌که مستقیم کد بنویسید.

## هنگام تغییر معماری بزرگ
- اگر تصمیم واقعاً بزرگ و درازمدت است → یک ADR جدید در [[../ADR/README|ADR/]] بنویسید (Context/Decision/Alternatives/Consequences/Trade-offs/Future considerations).
- اگر تصمیم کوچک/عملیاتی است → یک ورودی در [[../Decision Logs/README|Decision Logs/]] کافی است.

## هنگام کشف یک قانون/محدودیت جدید
همان جلسه به [[Engineering_Constitution|Engineering_Constitution.md]] یا [[System_Constraints|System_Constraints.md]] اضافه کنید — این حافظهٔ دائمی پروژه است، نه فقط مکالمهٔ فعلی.

## هنگام مستندسازی
- **کد را کپی نکنید** — فقط مسیر فایل را لینک بدهید.
- **محتوای `docs/` را بازنویسی نکنید** — خلاصهٔ کوتاه + لینک.
- اگر چیزی را نمی‌دانید (نه از کد استخراج شده)، صراحتاً «فرضیه» یا «نیاز به تأیید» علامت بزنید — هرگز جعل نکنید.

## هنگام برخورد با ریسک/ابهام واقعی
مثال واقعی این جلسه: وضعیت `chat-go` نامشخص بود — به‌جای فرض‌کردن، در [[../ADR/010-websocket-realtime-strategy|ADR-010]] به‌صراحت به‌عنوان «proposed، نیاز به تأیید» ثبت شد، نه پاک‌سازی یا حذف بدون اجازه.

## عملیات پرریسک (destructive)
قبل از `git reset/checkout/clean`، `prisma db push` روی دیتابیس drift‌دار، یا هر حذف داده — طبق [[Engineering_Constitution|Engineering_Constitution.md]] عمل کنید و در صورت شک، از کاربر بپرسید.

## روابط
- [[Prompt_Library|Prompt_Library.md]]
- [[Agent_Memory|Agent_Memory.md]]
