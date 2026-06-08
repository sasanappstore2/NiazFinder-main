# Location registry bridge

NiazFinder uses one city registry for browse, intake, and API filters.

## Sources (do not duplicate)

| Layer | Module | Role |
|-------|--------|------|
| Registry data | `src/lib/location-system.ts` | Provinces + cities (Persian names, stable ids) |
| URL slugs | `src/lib/search/city-slugs.ts` | `mashhad-city` → `mashhad`, slug ↔ Persian name |
| Browse scope | `src/lib/search/location-scope.ts` | Cookie + `/n/{city}` path → `LocationScope` |
| Geo API | `src/lib/search/geo-api-filters.ts` | Query `cities=` slugs → exact `city` column match |
| Intake form | `src/lib/need-intake/sync-intake-location-form.ts` | Persian select value ↔ catalog city id |

## Unified helper

```ts
import { resolveCityForBrowse } from '@/lib/search/location-scope';

resolveCityForBrowse('mashhad');           // { slug: 'mashhad', persianName: 'مشهد' }
resolveCityForBrowse(null, 'مشهد');       // { slug: 'mashhad', persianName: 'مشهد' }
```

Use this when converting path slugs, intake city fields, or cookie values before calling browse/geo APIs.

## Neighborhoods

Neighborhood slugs come from `src/data/neighborhoods/catalog/{cityId}.json`. Publish writes `_neighborhoodSlug` in `dynamicAnswers`; browse and alerts filter on the same slug keys (see `docs/NEIGHBORHOOD_FILTERS.md`).

### Rebuild / تکمیل محله‌ها

| Command | Purpose |
|---------|---------|
| `npm run neighborhoods:import:city -- --city=mashhad` | Refresh one city from Divar |
| `npm run neighborhoods:import:osm` | Fill gaps from OpenStreetMap (unmapped / empty) |
| `npm run neighborhoods:apply-supplements` | Merge colloquial aliases (`src/data/neighborhoods/supplements/*.json`) |
| `npm run neighborhoods:generate-known-areas` | Regenerate intake area hints (`known-areas.json`) |
| `npm run neighborhoods:rebuild-deep` | Full safe pipeline (Divar + OSM + supplements + validate) |

**Important:** Divar import no longer wipes existing catalogs when Divar returns zero districts (keeps OSM/manual data). Use `--force` on import to overwrite anyway.

Current scale (manifest): **~397 cities**, **31 provinces**, **13k+ neighborhoods** in catalogs. Supplements add colloquial names (e.g. «قرنی» in Mashhad) as searchable aliases.
