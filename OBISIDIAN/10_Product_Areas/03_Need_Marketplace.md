---
title: "بازار نیازها"
tags: [product-area]
status: live
---

# بازار نیازها

## یک خط

مرور و کشف آگهی‌های نیاز بر اساس شهر، دسته و محله.

## برای چه کسی

کارفرما، کسب‌وکار، مهمان

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/n/iran` | کل ایران |
| `/n/{city}` | شهر |
| `/n/{city}/{category}/...` | فیلتر |
| `/v/{slug}/{id}` | جزئیات |

## چه کار می‌کند

- لیست نیازها
- فیلتر دسته و محله
- کارت نیاز
- صفحه جزئیات

## منطق و قوانین

- URL canonical (middleware)
- legacy redirect از /browse-requests

## ویژگی‌های فعلی

- [x] BrowseFilterBar
- [x] need cards
- [x] neighborhood filters

## ارتباط با بخش‌های دیگر

[[02_Need_Intake]]
[[06_Matching_Leads]]
[[10_Proposals_Reviews]]
[[16_SEO_Canonical_URLs]]

## ایده‌ها / آینده

- [ ] #idea ذخیره جستجو
- [ ] #idea هشدار نیاز جدید در دسته

## پیاده‌سازی

- [[../../docs/NEIGHBORHOOD_FILTERS.md|docs/NEIGHBORHOOD_FILTERS.md]]
- [[../../docs/CATEGORY_FILTERS.md|docs/CATEGORY_FILTERS.md]]
- [[../../docs/LOCATION_AUTO.md|docs/LOCATION_AUTO.md]]
- `src/middleware.ts`
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## پیاده‌سازی فنی (فایل‌ها و مسیرها)

*(merge شده از `01_Features/MarketplaceBrowse.md` — شامل بازار کسب‌وکار، به [[04_Business_Marketplace]] هم مرتبطه)*

| نوع | مسیر |
|-----|------|
| صفحات | `/n/{location}` → `src/app/(main)/n/[location]/page.tsx`، `/b/{slug}` → `.../b/[slug]/page.tsx`، `/v/{slug}/{id}` → `.../v/[...path]/page.tsx` |
| Middleware | `src/middleware.ts` (legacy `?category=` → path segments)، `next.config.ts` (legacy redirects) |
| Config/Search | `src/config/market-routes.ts`, `src/lib/search/`, `src/config/category-filters/` |
| Data | `src/data/neighborhoods/` |

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
