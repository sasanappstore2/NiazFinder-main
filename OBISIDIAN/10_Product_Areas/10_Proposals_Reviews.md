---
title: "پیشنهاد و نظر"
tags: [product-area]
status: live
---

# پیشنهاد و نظر

## یک خط

قیمت‌دهی روی نیاز و اعتمادسازی با review.

## برای چه کسی

کسب‌وکار، کارفرما

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/api/proposals` | CRUD |
| `submit-review` | نظر |

## چه کار می‌کند

- ارسال پیشنهاد قیمت
- پذیرش/رد
- امتیاز و متن

## منطق و قوانین

- یک پیشنهاد پذیرفته → بستن نیاز
- review پس از تکمیل

## ویژگی‌های فعلی

- [x] proposal status
- [x] rating

## ارتباط با بخش‌های دیگر

[[03_Need_Marketplace]]
[[07_Communication_Chat]]
[[05_Business_Profile]]

## ایده‌ها / آینده

- [ ] #idea پیشنهاد مرحله‌ای (milestone)

## پیاده‌سازی

- `src/app/api/proposals/`
- `src/app/api/reviews/`
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
