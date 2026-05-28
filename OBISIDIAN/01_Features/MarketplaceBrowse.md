---
title: Marketplace Browse
tags: [feature, marketplace, seo]
---

# Marketplace Browse (`/n`, `/b`, `/v`)

بازار نیازها و کسب‌وکارها با URLهای canonical و فیلتر محله/دسته.

## Docs

- [docs/NEIGHBORHOOD_FILTERS.md](../../docs/NEIGHBORHOOD_FILTERS.md)
- [docs/CATEGORY_FILTERS.md](../../docs/CATEGORY_FILTERS.md)
- [docs/LOCATION_AUTO.md](../../docs/LOCATION_AUTO.md)

## Routes (pages)

| Canonical | Page |
|-----------|------|
| `/n/{location}` | [n location page](../../src/app/%28main%29/n/%5Blocation%5D/page.tsx) |
| `/b/{slug}` | [b slug page](../../src/app/%28main%29/b/%5Bslug%5D/page.tsx) |
| `/v/{slug}/{id}` | [v detail page](../../src/app/%28main%29/v/%5B...path%5D/page.tsx) |

## Middleware

- [src/middleware.ts](../../src/middleware.ts) — legacy `?category=` → path segments
- [next.config.ts](../../next.config.ts) — legacy path redirects

## Config & search

- [src/config/market-routes.ts](../../src/config/market-routes.ts)
- [src/lib/search/](../../src/lib/search/)
- [src/config/category-filters/](../../src/config/category-filters/)

## Data

- Neighborhood catalog: [src/data/neighborhoods/](../../src/data/neighborhoods/)

## Related

- [[../00_Index/Architecture|Architecture]]
- [[NeedIntake]]
