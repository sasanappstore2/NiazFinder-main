# Iran Honeycomb Geo Map

Interactive honeycomb map for Analytics Hub **Geo** tab: 31 provinces + 399 cities with real boundaries and heatmap metrics.

## Data sources

| File | Source |
|------|--------|
| `iran-provinces-boundaries.geojson` | [geoBoundaries](https://www.geoboundaries.org) IRN ADM1 |
| `iran-cities-centroids.json` | GeoNames IR (optional cache) + province bbox offsets |
| `iran-national-hex-layout.json` | Generated — hex at geographic centroids |
| `provinces/{id}-cities-hex.json` | Generated — city honeycomb per province |

## Regenerate data

```bash
npm run geo:import
npm run geo:build
npm run test:geo-map-data
```

### Individual steps

```bash
npx tsx scripts/geo/import-province-boundaries.ts
npx tsx scripts/geo/compute-province-centroids.ts
npx tsx scripts/geo/build-province-svg-paths.ts
npx tsx scripts/geo/assert-province-slugs.ts
npx tsx scripts/geo/import-city-centroids.ts
npx tsx scripts/geo/build-national-hex-layout.ts
npx tsx scripts/geo/build-province-city-layouts.ts
```

Optional: download GeoNames `IR.zip` to `src/data/geo/raw/IR.txt` for accurate city coordinates.

## UI

- **National view:** 31 hex cells positioned by province centroid
- **Click province:** morph to real boundary + city honeycomb drill-down
- **Metrics:** sessions, pageViews, uniqueVisitors, bounceRate, conversionRate
- **Compare mode:** green/red delta from filter bar

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/super-admin/analytics/geo?level=province&metric=` | Province heatmap rows |
| `GET /api/super-admin/analytics/geo/cities?province=` | All cities in province |
| `GET /api/super-admin/analytics/geo/detail?province=&city=` | Region KPI panel |
| `GET /api/super-admin/analytics/geo/layout?province=` | City hex layout JSON |

## Visual QA checklist

- [ ] All 31 provinces visible on national map
- [ ] Click Tehran → boundary morph + city hexes
- [ ] Tooltip shows Persian name + count
- [ ] Compare toggle changes colors
- [ ] CSV export on city table works
- [ ] SVG export button downloads map
