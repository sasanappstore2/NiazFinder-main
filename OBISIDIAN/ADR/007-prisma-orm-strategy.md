---
title: "ADR-007: Prisma ORM Strategy"
tags: [adr, database]
status: accepted
---

# ADR-007: Prisma ORM Strategy

> ⚠️ **این ADR بر پایهٔ observation کد در تاریخ ۲۰۲۶-۰۷-۱۶ نوشته شده، نه تاریخچهٔ واقعی مستندشدهٔ تصمیم‌گیری.** در `docs/adr/` معادلی برای آن یافت نشد.

**وضعیت**: پذیرفته‌شده (استنباط‌شده از کد فعلی)

## Context
پروژه به یک لایهٔ دسترسی داده نیاز داشت که با PostgreSQL + pgvector (برای embedding های RAG/location) کار کند، type-safety کامل با TypeScript بدهد، و بتواند schema بزرگ و به‌سرعت رشدکننده (۶۳ مدل، ۲۵ enum) را مدیریت کند.

## Decision
Prisma 6 به‌عنوان ORM اصلی، با یک فایل `schema.prisma` واحد (نه چند schema جدا) سازمان‌دهی‌شده در ۱۷ بخش دامنه‌ای با کامنت `// ====` — این قرارداد به‌جای split کردن به چند فایل، خوانایی را با کامنت‌بندی داخلی حفظ می‌کند.

عملیات پولی حساس (کیف پول، لید فی) از `$transaction` با `Prisma.TransactionClient` + قفل ردیف خام (`$executeRaw SELECT ... FOR UPDATE`) استفاده می‌کنند — نه صرفاً optimistic locking پیش‌فرض Prisma.

## Alternatives
- **Drizzle ORM**: سبک‌تر و type-inference بهتر در برخی موارد، اما اکوسیستم migration/introspection Prisma برای schema به این بزرگی بالغ‌تر بود.
- **Raw SQL / query builder (Kysely)**: کنترل کامل‌تر روی کوئری‌ها اما هزینهٔ نگهداری type-safety بالاتر برای تیم کوچک.
- **چند schema.prisma جدا به تفکیک دامنه**: خوانایی بهتر در تئوری، اما Prisma هنوز چند-schema رسمی را به‌طور کامل پشتیبانی نمی‌کند (در زمان این تصمیم).

## Consequences
- تمام مدل‌ها در یک فایل بزرگ (`schema.prisma`) قرار دارند — نیاز به کامنت‌بندی دقیق برای پیمایش (که انجام شده).
- `prisma migrate dev` به یک shadow database نیاز دارد که می‌تواند در صورت drift تاریخچهٔ migration شکست بخورد — این یک ریسک عملیاتی واقعی است (نمونهٔ رخ‌داده در ۲۰۲۶-۰۷-۱۶، به [[../Debug/README|Debug/]] مراجعه کنید).
- الگوی lock-check دستی برای عملیات پولی یک قرارداد تیمی است، نه یک ویژگی خودکار Prisma — باید در هر PR جدید که کیف پول را لمس می‌کند، دستی رعایت شود.

## Trade-offs
سرعت توسعه (schema واحد، type-safety خودکار) در برابر ریسک عملیاتی migration drift در محیط dev طولانی‌مدت.

## Future considerations
- بررسی خودکارسازی چک migration drift به‌عنوان بخشی از `check:all` یا CI، تا از تکرار حادثهٔ ۲۰۲۶-۰۷-۱۶ جلوگیری شود.
- در صورت رشد بیشتر schema، ارزیابی مجدد راه‌حل‌های چند-schema رسمی Prisma (در صورت رسیدن به بلوغ کافی).

## روابط
- [[../Architecture/Database/schema-overview|Architecture/Database/schema-overview]]
- [[011-wallet-monetization-strategy|ADR-011]] (بزرگ‌ترین مصرف‌کنندهٔ الگوی lock-check)
