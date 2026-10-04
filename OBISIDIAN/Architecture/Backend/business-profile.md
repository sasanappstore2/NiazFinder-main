---
title: "Architecture: Business Profile"
tags: [architecture, backend, business]
status: live
---

# Business Profile (`src/lib/business/`)

## هدف
بزرگ‌ترین دامنهٔ کسب‌وکار در `src/lib/` (۱۱۹ فایل) — onboarding، مدیریت پروفایل، پیشنهادها (offers)، portfolio، فروشگاه آنلاین، mapping مشاغل، مرور.

## زیرسیستم‌ها (بر اساس نام‌گذاری فایل‌ها)
- Onboarding کسب‌وکار جدید
- مدیریت مشاغل/occupations (`src/config/business-occupations.ts`, `need-to-occupation-map.ts`)
- فروشگاه‌های آنلاین (online-stores)
- Import سایت کسب‌وکار (hub/estate-scrape)
- Map tiles اختصاصی کسب‌وکار
- ساخت idempotent پروفایل: `src/lib/business/ensure-profile.ts` (`ensureBusinessProfile`) — همان‌جا hook اعتبار هدیهٔ ثبت‌نام هم قرار دارد ([[wallet-payments|Architecture/Backend/wallet-payments]])

## API مرتبط
`business/**` (۴۰ روت) — `[id]`, browse, leads, map-pins, me, needs, occupations, online-stores, private-leads, slug.

## دادهٔ مرتبط
`BusinessProfile` (بخش UNIVERSAL BUSINESS PROFILE در schema).

## روابط
- صفحهٔ عمومی/ویرایش: `src/app/(main)/b/[slug]/`, `src/app/(main)/pro/[id]/edit/`
- کامپوننت‌ها: `src/components/business-profile/` (۱۰۵ فایل)
- محصول: [[../../10_Product_Areas/05_Business_Profile|10_Product_Areas/05_Business_Profile]]

## منابع کامل (docs/)
- [docs/BUSINESS_PROFILE_SYSTEM.md](../../../docs/BUSINESS_PROFILE_SYSTEM.md)
