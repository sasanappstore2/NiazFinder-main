---
title: "SEO و URLهای Canonical"
tags: [product-area]
status: live
---

# SEO و URLهای Canonical

## یک خط

ساختار URL پایدار برای SEO و اشتراک‌گذاری.

## برای چه کسی

سیستم (تأثیر روی همه)

## مسیرهای سایت

| URL | توضیح |
|-----|--------|
| `/n/` | نیاز |
| `/b/` | کسب‌وکار |
| `/v/` | جزئیات |
| `redirects در next.config` | undefined |

## چه کار می‌کند

- 301 از legacy paths
- middleware category query → path
- metadata در layout

## منطق و قوانین

- یک نام پارامتر dynamic در segment
- routeBuilder single source

## ویژگی‌های فعلی

- [x] next.config redirects
- [x] middleware
- [x] JSON-LD homepage

## ارتباط با بخش‌های دیگر

[[03_Need_Marketplace]]
[[04_Business_Marketplace]]
[[05_Business_Profile]]

## ایده‌ها / آینده

- [ ] #idea sitemap.xml پویا
- [ ] #idea hreflang

## پیاده‌سازی

- next.config.ts
- `src/middleware.ts`
- `src/config/routes.ts`
- Appendix: [[../90_Technical_Appendix/README|Technical Appendix]]

## وضعیت

`live`

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
