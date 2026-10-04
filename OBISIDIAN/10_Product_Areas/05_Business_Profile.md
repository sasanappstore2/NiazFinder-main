---
title: "پروفایل کسب‌وکار"
tags: [product-area]
status: live
---

# پروفایل کسب‌وکار

## یک خط

صفحه عمومی اعتمادساز: معرفی، خدمات، نمونه‌کار، تماس.

## برای چه کسی

کارفرما (می‌بیند)، کسب‌وکار (ویرایش)

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/b/{slug}` | عمومی |
| `/pro/{id}/edit` | ویرایش |

## چه کار می‌کند

- نمایش offerها و portfolio
- CTA چت/تماس
- SEO meta

## منطق و قوانین

- slug یکتا
- فقط مالک ویرایش
- lead alerts per business

## ویژگی‌های فعلی

- [x] ServicesProducts
- [x] Portfolio
- [x] reviews section
- [x] AI assistant config

## ارتباط با بخش‌های دیگر

[[04_Business_Marketplace]]
[[07_Communication_Chat]]
[[06_Matching_Leads]]
[[09_Dashboard_Owner]]

## ایده‌ها / آینده

- [ ] #idea ویدیو معرفی
- [ ] #idea رزرو وقت

## پیاده‌سازی

- [[../../docs/BUSINESS_PROFILE_SYSTEM.md|docs/BUSINESS_PROFILE_SYSTEM.md]]
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## پیاده‌سازی فنی (فایل‌ها و مسیرها)

*(merge شده از `01_Features/BusinessProfile.md`)*

| نوع | مسیر |
|-----|------|
| صفحه عمومی | `src/app/(main)/b/[slug]/` |
| صفحه ویرایش | `src/app/(main)/pro/[id]/edit/page.tsx` |
| Components | `src/components/business-profile/` |
| API | `GET/PATCH /api/business/me` — offers/portfolio/layout/extensions زیر `business/me/**` |
| Domain | `src/lib/business/` |

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
