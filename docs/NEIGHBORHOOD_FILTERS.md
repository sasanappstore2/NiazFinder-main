# فیلتر محله (سبک دیوار)

## خلاصه

وقتی کاربر **دقیقاً یک شهر** انتخاب کرده و آن شهر در کاتالوگ محله داده دارد، pill **«انتخاب محله»** در نوار فیلتر browse نمایش داده می‌شود.

## URL

```
/s/mashhad/real-estate?neighborhoods=آزادشهر,آبادگران
```

| پارام | معنی |
|--------|------|
| `neighborhoods` | slug محله‌ها (جداشده با ویرگول) |
| `neighborhoodCity` | slug شهر برای resolve (در API از کلاینت ارسال می‌شود) |

با تغییر شهر در هدر، `neighborhoods` پاک می‌شود ([`apply-location.ts`](../src/lib/search/apply-location.ts)).

## داده

- مدل: [`ManagedNeighborhood`](../src/lib/locations/managed-types.ts) با فیلد اختیاری `areas: string[]`
- کاتالوگ هر شهر: `src/data/neighborhoods/catalog/{cityId}.json`
- منبع import: API عمومی دیوار `api.divar.ir/v1/places/cities/{id}/districts`
- نگاشت دستی شهرها: [`divar-city-map.manual.json`](../src/data/neighborhoods/divar-city-map.manual.json)

### اسکریپت‌ها

| دستور | کار |
|--------|-----|
| `npm run neighborhoods:import` | import همه شهرهای admin از دیوار |
| `npm run neighborhoods:import:city -- --city=mashhad` | import یک شهر |
| `npm run neighborhoods:validate` | اعتبارسنجی پوشش و کیفیت (مشهد، تهران، …) |
| `npx tsx scripts/neighborhoods/build-manual-map.ts` | پیشنهاد slug دستی برای شهرهای بدون match |

## API

- `GET /api/locations/neighborhoods?cityId=mashhad` — لیست محله‌های یک شهر
- `GET /api/requests?neighborhoods=...&neighborhoodCity=mashhad` — فیلتر آگهی‌ها

## سوپرادمین

بخش **موقعیت‌ها** → نوع «محله» → فیلد **زیرمحدوده‌ها** (هر خط یا با `،` / `,`).

ویرایش‌ها در فایل کاتالوگ همان شهر ذخیره می‌شود.

## UI

- [`NeighborhoodSelectorModal`](../src/components/browse/NeighborhoodSelectorModal.tsx)
- [`NeighborhoodFilterPill`](../src/components/browse/NeighborhoodFilterPill.tsx)
