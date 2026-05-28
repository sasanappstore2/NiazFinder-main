---
title: Graph View Guide
tags: [index, graph]
---

# راهنمای Graph — دو حالت

## حالت ۱ — نقشه محصول (پیشنهاد برای ایده)

در Graph → فیلتر:

```text
tag:#product-area OR tag:#product-moc
```

می‌بینی: **۱۶ بخش سایت** + ProductMap + Personas + ارتباطات — بدون صدها لینک کد.

شروع از: [[../00_Product_MOC/ProductMap|ProductMap]] → **Open local graph** (عمق ۲).

## حالت ۲ — بدون کاتالوگ فنی (پیش‌فرض فایل graph)

```text
-tag:#catalogue
```

همه Noteها به‌جز Appendix (APIRoutes، ComponentsIndex، …).

## حالت ۳ — فقط پیاده‌سازی

```text
tag:#catalogue
```

ستاره‌های لینک به `src/` — برای پیدا کردن فایل.

## تنظیمات پیشنهادی

- **Show orphans:** off
- **Depth (local graph):** 2
- **Forces:** repel ~10، link distance ~250

## رنگ‌بندی (Color groups)

| Query | معنی |
|--------|------|
| `tag:#product-area` | بخش‌های سایت (۱۶ تا) |
| `tag:#product-moc` | ProductMap، Personas، … |
| `tag:#idea` | IdeaInbox و ایده‌ها |
| `path:90_Technical_Appendix` | لایه فنی (خاکستری / جدا) |

## Related

- [[../00_Product_MOC/ProductMap|ProductMap]]
- [[Home]]
