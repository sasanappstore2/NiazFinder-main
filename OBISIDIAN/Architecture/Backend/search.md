---
title: "Architecture: Search"
tags: [architecture, backend, search]
status: live
---

# Search (`src/lib/search/`)

## هدف
جستجو/ایندکس یکپارچهٔ نیازها و کسب‌وکارها — پشتوانهٔ فیلترهای بازار (`/n`, `/b`).

## زیرساخت
Typesense (سرویس Docker profile `default`، طبق CLAUDE.md). ۱۷ فایل در `src/lib/search/`.

## روابط
- استراتژی معماری: [[../../ADR/009-search-architecture|ADR/009-search-architecture]]
- مصرف‌کننده اصلی: `src/config/category-filters/`، مرور بازار — [[../../10_Product_Areas/03_Need_Marketplace|10_Product_Areas/03_Need_Marketplace]]
- Middleware مرتبط: `src/middleware.ts` (rewrite `?category=` قدیمی)

## فرضیه
جزئیات دقیق schema ایندکس Typesense در این جلسه استخراج نشد — برای تغییر واقعی، کد `src/lib/search/` را مستقیم بخوانید.
