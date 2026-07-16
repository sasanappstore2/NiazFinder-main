---
title: "بازار کسب‌وکارها"
tags: [product-area]
status: live
---

# بازار کسب‌وکارها

## یک خط

لیست کسب‌وکارها و متخصصان برای انتخاب و مقایسه.

## برای چه کسی

کارفرما

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/b/iran` | کل ایران |
| `/b/{city}` | شهر |
| `/b/{slug}` | پروفایل |

## چه کار می‌کند

- مرور کسب‌وکار
- فیلتر شهر/دسته
- ورود به پروفایل

## منطق و قوانین

- canonical /b/ vs legacy /specialists

## ویژگی‌های فعلی

- [x] business browse cards
- [x] compare (اگر فعال)

## ارتباط با بخش‌های دیگر

[[05_Business_Profile]]
[[07_Communication_Chat]]
[[13_Search_Discovery]]

## ایده‌ها / آینده

- [ ] #idea رتبه‌بندی بر اساس پاسخ‌گویی
- [ ] #idea نشان verified

## پیاده‌سازی

- `src/config/market-routes.ts`
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
- [[03_Need_Marketplace]] — پیاده‌سازی فنی مشترک (routes/middleware/search)
