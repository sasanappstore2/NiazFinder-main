# فیلتر محله (سبک دیوار)

## خلاصه

وقتی کاربر **دقیقاً یک شهر** انتخاب کرده و آن شهر در کاتالوگ محله داده دارد، pill **«انتخاب محله»** در نوار فیلتر browse نمایش داده می‌شود.

## URL

```
/n/mashhad/real-estate?neighborhoods=azadshahr,abadgaran&neighborhoodCity=mashhad
```

| پارام | معنی |
|--------|------|
| `neighborhoods` | slug محله‌ها (جداشده با ویرگول) |
| `neighborhoodCity` | slug شهر برای resolve (در API از کلاینت ارسال می‌شود) |

با تغییر شهر در هدر، `neighborhoods` پاک می‌شود ([`apply-location.ts`](../src/lib/search/apply-location.ts)).

## داده

- مدل: [`ManagedNeighborhood`](../src/lib/locations/managed-types.ts) با فیلد اختیاری `areas: string[]`
- کاتالوگ هر شهر: `src/data/neighborhoods/catalog/{cityId}.json`
- هندسهٔ نقشه: `src/data/neighborhoods/geo/{cityId}.geojson`
- منبع import: API عمومی دیوار `api.divar.ir/v1/places/cities/{id}/districts`
- نگاشت دستی شهرها: [`divar-city-map.manual.json`](../src/data/neighborhoods/divar-city-map.manual.json)

### اسکریپت‌ها

| دستور | کار |
|--------|-----|
| `npm run neighborhoods:import` | import همه شهرهای admin از دیوار |
| `npm run neighborhoods:import:city -- --city=mashhad` | import یک شهر |
| `npm run neighborhoods:validate` | اعتبارسنجی پوشش و کیفیت (مشهد، تهران، …) |
| `npm run neighborhoods:build-geo` | ساخت polygon مصنوعی برای همهٔ محله‌ها |
| `npm run neighborhoods:ensure-areas` | تضمین حداقل ۳ زیرمحدوده در هر محله |
| `npm run neighborhoods:import-geo` | import polygon از OSM (جایگزینی synthetic در صورت match) |
| `npm run neighborhoods:rebuild-deep` | pipeline کامل import + geo + areas + validate |
| `npm run test:neighborhoods` | self-test کاتالوگ و مرز نقشه |
| `npx tsx scripts/neighborhoods/build-manual-map.ts` | پیشنهاد slug دستی برای شهرهای بدون match |

## API

- `GET /api/locations/neighborhoods?cityId=mashhad` — لیست محله‌های یک شهر
- `GET /api/locations/neighborhoods/geo?cityId=mashhad&ids=slug1,slug2` — polygon محله‌های انتخاب‌شده برای نقشه
- `GET /api/requests?neighborhoods=...&neighborhoodCity=mashhad` — فیلتر آگهی‌ها

## نقشه

وقتی محله در browse انتخاب شود، مرز نئون‌سبز (`#39ff14`) دور محدودهٔ همان محله‌ها روی نقشه نمایش داده می‌شود و viewport روی آن‌ها zoom می‌کند.

## سوپرادمین

بخش **موقعیت‌ها** → نوع «محله» → فیلد **زیرمحدوده‌ها** (هر خط یا با `،` / `,`).

ویرایش‌ها در فایل کاتالوگ همان شهر ذخیره می‌شود.

## UI

- [`NeighborhoodSelectorModal`](../src/components/browse/NeighborhoodSelectorModal.tsx)
- [`NeighborhoodFilterPill`](../src/components/browse/NeighborhoodFilterPill.tsx)
