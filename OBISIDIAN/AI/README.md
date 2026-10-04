---
title: "AI — حافظهٔ ایجنت‌های آینده"
tags: [ai]
status: live
---

# AI — حافظهٔ ایجنت‌های آینده

## هدف
این پوشه طوری نوشته شده که یک ایجنت AI تازه (Claude، Cursor، یا هر ابزار دیگر) با خواندن آن، بدون نیاز به کاوش کامل ریپو، بتواند دربارهٔ پروژه تصمیم درست بگیرد.

## اسناد (ترتیب خواندن)
1. [[CLAUDE_CONTEXT|CLAUDE_CONTEXT.md]] — سند master: چشم‌انداز، معماری خلاصه، محدودیت‌های حیاتی، اولویت‌ها
2. [[Engineering_Constitution|Engineering_Constitution.md]] — قوانین سخت‌گیرانهٔ غیرقابل‌نقض
3. [[System_Constraints|System_Constraints.md]] — محدودیت‌های فنی/کسب‌وکاری
4. [[Architectural_Principles|Architectural_Principles.md]]
5. [[Coding_Standards|Coding_Standards.md]]
6. [[Project_Vocabulary|Project_Vocabulary.md]] — واژه‌نامهٔ فارسی↔انگلیسی
7. [[AI_Collaboration_Guide|AI_Collaboration_Guide.md]] — چطور با این پروژه کار کنیم
8. [[Prompt_Library|Prompt_Library.md]] — پرامپت‌های تکرارشوندهٔ مفید
9. [[Agent_Memory|Agent_Memory.md]] — یادداشت‌های زندهٔ ایجنت‌ها (به‌مرور به‌روزرسانی می‌شود)
10. [[Cursor_Context|Cursor_Context.md]] — نسخهٔ کوتاه‌شدهٔ ابزار-محور برای Cursor

> نکته: `CLAUDE_CONTEXT.md` هم نقش نسخهٔ فشردهٔ Claude را ایفا می‌کند — روی این فایل‌سیستم (case-insensitive) یک فایل جدای `Claude_Context.md` با همین نام برخورد می‌کرد، پس تکرار نشد.

## روابط
- معماری فنی تفصیلی: [[../Architecture/README|Architecture/]]
- تصمیم‌های معماری: [[../ADR/README|ADR/]]

## قانون نگهداری
هر بار که یک قانون/محدودیت مهم جدید کشف می‌شود (مثل «کاربر عادی هیچ‌وقت برای ثبت نیاز پول پرداخت نکند»)، باید همان روز به `Engineering_Constitution.md` یا `System_Constraints.md` اضافه شود — نه فقط در حافظهٔ مکالمه بماند.
