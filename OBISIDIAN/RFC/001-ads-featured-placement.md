---
title: "RFC-001: Ads & Featured Placement"
tags: [rfc, business]
status: draft
---

# RFC-001: تبلیغات و جایگاه ویژه

**وضعیت**: پیش‌نویس — بک‌لاگ، پیاده‌سازی‌نشده

## خلاصه
کسب‌وکارها بتوانند پروفایل خود را ویژه کنند، در نتایج منطقه بالاتر نمایش داده شوند، یا اسپانسر یک دسته‌بندی شوند.

## قید حیاتی از اسپک اصلی
**تبلیغات نباید کیفیت Matching را خراب کند.** یعنی جایگاه ویژه باید بصری/چیدمانی جدا از امتیاز تطبیق واقعی (`matchScore` در [[../Architecture/Backend/smart-matching|Architecture/Backend/smart-matching]]) نمایش داده شود — نه جایگزین آن. اگر پیاده‌سازی این قید را نقض کند (مثلاً یک کسب‌وکار کم‌کیفیت صرفاً با پرداخت بالاتر از کسب‌وکار مرتبط‌تر جلوتر بیفتد)، این RFC باید رد یا بازطراحی شود.

## سؤالات باز
- آیا جایگاه ویژه فقط در `SmartLeadsSection`/بازار عمومی (`/n`, `/b`) اثر دارد یا در نتایج جستجوی داخلی هم؟
- مدل قیمت‌گذاری: حراج (auction) یا فی ثابت روزانه/هفتگی؟ (توجه: قانون کاربر «Dynamic Pricing پیچیده استفاده نشود» ممکن است حراج را رد کند.)
- آیا از همان زیرساخت کیف پول ([[../Architecture/Backend/wallet-payments|Architecture/Backend/wallet-payments]]) استفاده می‌شود؟ (پاسخ محتمل: بله، طبق قانون «تمام پرداخت‌ها از Wallet».)

## روابط
- [[../10_Product_Areas/17_Monetization_Backlog|10_Product_Areas/17_Monetization_Backlog]]
- [[../ADR/011-wallet-monetization-strategy|ADR-011]]
- [[../Architecture/Backend/search|Architecture/Backend/search]] (اگر روی نتایج جستجو هم اثر بگذارد)
