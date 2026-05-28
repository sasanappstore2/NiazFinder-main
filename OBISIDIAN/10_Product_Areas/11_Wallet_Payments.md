---
title: "کیف پول"
tags: [product-area]
status: partial
---

# کیف پول

## یک خط

موجودی، تراکنش، واریز/برداشت (در صورت فعال بودن).

## برای چه کسی

کاربران ثبت‌نام‌شده

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/api/wallet` | API |
| `dashboard wallet tab` | UI |

## چه کار می‌کند

- نمایش balance
- تاریخچه تراکنش

## منطق و قوانین

- escrow / commission در مدل داده

## ویژگی‌های فعلی

- [x] Transaction types enum

## ارتباط با بخش‌های دیگر

[[09_Dashboard_Owner]]
[[10_Proposals_Reviews]]

## ایده‌ها / آینده

- [ ] #idea پرداخت آنلاین درگاه
- [ ] #idea کمیسیون پلتفرم خودکار

## پیاده‌سازی

- prisma Wallet model
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## وضعیت

`partial`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
