# فیلترهای اختصاصی دسته‌بندی

منبع حقیقت: [`src/config/category-filters/`](../src/config/category-filters/)

## معماری

- **ثبت آگهی (intake):** `getIntakeFieldsForCategory(slug)` از همان رجیستری فیلدهای [`need-schemas`](../src/config/need-schemas/) را می‌سازد.
- **مرور (browse):** `getFiltersForCategory(slug, listingType)` فیلدهای pill هدر را برمی‌گرداند؛ فیلدهای تکراری با مسیر URL (مثلاً `apartment-sale`) با [`path-inference.ts`](../src/config/category-filters/path-inference.ts) مخفی می‌شوند.
- **URL:** پارامترهای سراسری (`price`, `sort`, `urgent`, …) + атрибут‌های دسته (`dealType`, `rooms`, `area=80-120`, …) در `BrowseFilters.attributes`.
- **API:** `GET /api/requests` فیلتر `dynamicAnswers` (contains) + `budgetMin`/`budgetMax` + `priority` + `recent`.

## عمودها (ریشه)

| ریشه | فیلترهای browse (نمونه) |
|------|-------------------------|
| real-estate | dealType, propertyKind, rooms, area, amenities |
| vehicles | dealType, vehicleKind, condition, year, mileage |
| electronics | dealType, productName, condition, storage, ram |
| home-appliances | dealType, condition |
| services | when, urgent (serviceCategory از مسیر) |
| jobs | roleType, employmentType, salary, experience |
| social | socialType, urgent |

## تست

```bash
npm run test:category-filters
npm run test:intake-parser
```

## QA دستی

1. `/n/tehran/real-estate/apartment-sale?dealType=buy&rooms=2` — pillها و لیست هم‌خوان
2. ثبت نیاز املاک — همان فیلدهای dealType/rooms در intake
3. `/n/tehran/vehicles/car-ride?condition=used` — فیلتر وضعیت
4. `/post` — بدون نوار فیلتر category در هدر
