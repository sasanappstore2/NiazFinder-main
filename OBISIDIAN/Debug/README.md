---
title: "Debug"
tags: [debug]
status: live
---

# Debug

## هدف
راهنمای دیباگ مشکلات رایج — نقطهٔ شروع وقتی چیزی کار نمی‌کند.

## اسناد
- [[../03_Operations_Debug/DebugPlaybook|03_Operations_Debug/DebugPlaybook]] — playbook اصلی دیباگ (لایهٔ قدیمی، دست‌نخورده)
- [[../03_Operations_Debug/HealthScripts|03_Operations_Debug/HealthScripts]] — اسکریپت‌های health-check

## دام‌های شناخته‌شدهٔ تکرارشونده (از تجربهٔ جلسات قبلی — مهم برای ایجنت‌های AI)
- **کش خراب Turbopack**: گاهی حتی با ری‌استارت کامل dev server هم rebuild خراب باقی می‌ماند؛ فقط حذف کامل پوشهٔ `.next` (نه فقط `.next/cache`) قابل‌اعتماد است.
- **Migration drift بین `prisma/migrations/` و دیتابیس دولوپمنت**: `prisma migrate dev` می‌تواند با خطای shadow-database شکست بخورد اگر تاریخچهٔ migration واگرا شده باشد. `prisma db push` جایگزین سریع‌تر است اما **خطرناک**: هر drift دیگری هم در schema (حتی نامرتبط با کار جاری) را بی‌صدا اعمال می‌کند و می‌تواند داده واقعی را drop کند — همیشه خروجی هشدار data-loss را کامل بخوانید قبل از تأیید.
- **کلیک/تایپ ناپایدار در Browser pane** هنگام تست UI خودکار — گاهی fetch مستقیم از طریق کنسول قابل‌اعتمادتر از شبیه‌سازی کلیک است.

## روابط
- چک‌لیست release/refactor: [[../Playbooks/README|Playbooks/]]

## ترتیب خواندن
`DebugPlaybook` → بخش «دام‌های شناخته‌شده» بالا اگر مشکل آشنا به نظر می‌رسد.
