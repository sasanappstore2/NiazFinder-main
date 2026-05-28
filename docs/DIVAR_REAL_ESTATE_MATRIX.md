# ماتریس املاک دیوار ↔ NiazFinder

مرجع هم‌ترازی taxonomy و فیلترهای intake (`/post`) با browse دیوار.

## Taxonomy

| دیوار (parent → leaf) | URL دیوار | NiazFinder slug |
|----------------------|-----------|-----------------|
| فروش مسکونی → آپارتمان | `buy-apartment` | `apartment-sale` |
| فروش مسکونی → خانه و ویلا | `buy-villa` | `villa-sale` |
| فروش مسکونی → زمین و کلنگی | `buy-old-house` | `land-sale` |
| اجاره مسکونی → آپارتمان | `rent-apartment` | `apartment-rent` |
| اجاره مسکونی → خانه و ویلا | `rent-villa` | `villa-rent` |
| اجاره مسکونی → زمین | `rent-old-house` | `land-rent` |
| فروش اداری → دفتر / مغازه / صنعتی | `buy-office` … | `office-sale`, `shop-sale`, `industrial-sale` |
| اجاره اداری → … | `rent-office` … | `office-rent`, `shop-rent`, `industrial-rent` |
| **اجاره کوتاه‌مدت** → آپارتمان / ویلا / دفتر | `rent-temporary-*` | `suite-apartment-rent`, `villa-short-rent`, `workspace-short-rent` |
| پروژه‌های ساخت‌وساز → مشارکت | `contribution-construction` | `construction-partnership` |
| پیش‌فروش | `pre-sell-home` | `pre-sale-services` |

## فیلترهای هسته (intake فاز ۱)

| دسته | فیلدهای intake |
|------|----------------|
| فروش مسکونی/اداری | `budget`, `areaMin/Max`, `pricePerMeterMin/Max`, `rooms`, `yearMin/Max` (سن بنا), `floorMin/Max`, `amenities`, `deedType` |
| فروش زمین | `budget`, `area`, `pricePerMeter` — بدون `rooms` |
| اجاره | `deposit`, `monthlyRent`, `rahnAmount`, `area`, `rooms`, سن بنا، طبقه، `familyCount` (مسکونی), `amenities` |
| کوتاه‌مدت | `dealType=rent_short_term`, `guestCount`, `nightlyRent`, `area`, `rooms` |
| مشارکت | `areaMin`, `plotWidth`, `propertyKind`, `location` |
| پیش‌فروش | `projectName`, `delivery`, `propertyKind`, `dealType` |

فیلترهای جزئی دیوار (سرمایش، گرمایش، جنس کف، …) در فاز ۱ **سوال intake نیستند**؛ در `details` یا استخراج سبک از متن.

## نمونه‌برداری آگهی

```bash
npm run divar:research -- --city=tehran --limit=500
```

خروجی: [`data/divar/research/`](../data/divar/research/) — فراوانی واژگان در `summary.json`.

## نگاشت dealType

| دیوار / کاربر | `dealType` |
|---------------|------------|
| خرید / فروش | `buy` / `sell` |
| اجاره ماهانه | `rent_monthly` |
| رهن کامل | `rent_rahn_full` |
| رهن و اجاره | `rent_rahn_ejare` |
| اجاره روزانه / شب | `rent_short_term` |

## امکانات (`amenities`)

پارکینگ، آسانسور، انباری، مبله، **بالکن**, **بازسازی‌شده** — هم‌تراز chipهای پرتکرار دیوار.
