---
title: "Architecture: Component Structure"
tags: [architecture, frontend]
status: live
---

# Component Structure (`src/components/`)

## هدف
نقشهٔ ۲۸ گروه بزرگ کامپوننت — این سند کاتالوگ کامل را بازنویسی نمی‌کند، فقط hub است.

## گروه‌های بزرگ (حجم فایل)
| گروه | حجم | نکته |
|------|-----|------|
| `admin/` | ۱۰۶ | پنل ادمین |
| `business-profile/` | ۱۰۵ | صفحات/ویجت‌های پروفایل کسب‌وکار |
| `ui/` | ۶۱ | design-system primitives (shadcn/ui) |
| `workspace/` | ۴۹ | shell داشبورد/میزکار کاربر |
| `need-intake/` | ۴۲ | ویزارد فعلی intake |
| `need-intake.backup.20260711/` | ۴۰ | ⚠️ **پوشهٔ بکاپ تاریخ‌دار در سورس** — منشأ/ضرورت نگهداری تأیید‌نشده، پرچم برای تصمیم کاربر |
| `chat/` | ۴۰ | UI چت |
| `map/` | ۳۶ | UI نقشه |
| `shared/` | ۳۰ | کامپوننت مشترک بین دامنه‌ها |
| `filing/` | ۲۶ | UI پروندهٔ ثبتی |
| `need/` | ۲۷ | فهرست/جزئیات نیاز |
| بقیه (کوچک‌تر) | ۱-۱۴ هرکدام | business, dashboard, social, home, layout, auth, bookmarks, browse, contact, search, seo, voice, pwa, navigation, legal, notifications, providers, referral |

## ⚠️ نکتهٔ ریسک
`need-intake.backup.20260711/` باید یا حذف شود (اگر واقعاً بکاپ منسوخ است) یا دلیل نگهداریش مستند شود — این تصمیم در این جلسه گرفته نشد چون خارج از scope کار درخواستی بود.

## روابط
- کاتالوگ کامل خط‌به‌خط (بازنویسی نشده): `90_Technical_Appendix/Technical_Refs/ComponentsIndex.md`
- کاتالوگ صفحات: `90_Technical_Appendix/Technical_Refs/PagesCatalogue.md`
