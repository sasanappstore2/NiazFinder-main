# Filing system architecture

Persian real-estate **filings** (فایلینگ) — crawled portal listings and admin-managed regional files shown on `/f`.

## Naming

| Layer | Name | Notes |
|-------|------|-------|
| Product / UI | **Filing** | `src/components/filing/`, `/f`, `lib/filing/*` |
| Prisma / legacy admin | **RegionalFiling** | DB model unchanged; `Filing` is a type alias |
| Python crawl engine | **filing_feed** | `mini-services/estate-scrape/app/filing_feed/` |
| Deprecated import path | **filing-scrapers** | Re-exports `lib/filing/ingest` for one sprint |

## Layer map

```
components/filing, workspace/filings, admin/FilingsPanel
        ↓
lib/filing/browse      filters, load, categories
lib/filing/presentation view-model, detail sections, list cards
        ↓
lib/filing/schema      attribute-schema, category-templates, preferences
lib/filing/content     sanitize, spec-values, validate-by-deal
        ↓
lib/filing/adapters    Prisma ↔ listing DTOs, workspace feed
lib/filing/ingest      scraper runner, blueprints, normalize (TS)
        ↓
filing_feed (Python)   portal parsers, discovery, detail HTML
        ↓
RegionalFiling (DB)
```

## Directory layout

| Path | Role |
|------|------|
| `src/lib/filing/schema/` | Canonical deal × kind field model |
| `src/lib/filing/content/` | Description sanitization, validation |
| `src/lib/filing/presentation/` | View models, list card, demo gallery |
| `src/lib/filing/browse/` | Public browse filters and config |
| `src/lib/filing/adapters/` | DB and workspace adapters |
| `src/lib/filing/ingest/` | Crawl orchestration (replaces `filing-scrapers`) |
| `fixtures/filing-portals/` | Golden HTML, blueprints, diverse crawl samples |
| `fixtures/filing-portals/schema/` | JSON exported from TS domain |
| `scripts/filing/golden/` | Golden discovery/extraction tests |
| `scripts/filing/ops/` | Scheduler, fleet supervisor, crawl CLIs |
| `scripts/filing/sync-python-schema.mjs` | TS → JSON → Python `listing_attribute_schema.py` |

## Fixtures

```
fixtures/filing-portals/
  schema/attribute-schema.json
  schema/category-templates.json
  maskanyaban/          list-sample, blueprint, diverse-samples/
  showmelk/
  detail-samples/       golden detail HTML
  fleet-manifest.json
```

Python tests resolve fixtures via `app.filing_feed.fixture_paths.filing_portals_dir()`.

## Public browse flow

```
estate-scrape tick / manual import
        ↓
importScrapedFilings (list upsert + detail merge on enrich)
        ↓
RegionalFiling (PostgreSQL)
        ↓
queryFilingsForBrowse (Prisma where + in-memory range/poster filters)
        ↓ optional
Redis filing:browse:* / filing:detail:*  (FILING_CACHE_REDIS=true)
        ↓
GET /api/filings/browse?city=mashhad&dealType=sell&page=1
        ↓
/f  FilingBrowseShell (TanStack Query + URL-synced filters)
```

Stale portal listings are archived when `FILING_DELIST_ENABLED=true` after each crawl batch (per scraper, not global delete).

## API routes

| Canonical | Alias (deprecated) |
|-----------|-------------------|
| `GET /api/filings/browse` | Server-filtered browse + pagination |
| `GET /api/filings/[id]` | Public detail (Redis-backed when enabled) |
| `GET/POST /api/super-admin/filings` | `/api/super-admin/regional-filings` |
| `GET/PATCH/DELETE /api/super-admin/filings/[id]` | same |

Scraper admin APIs remain under `/api/super-admin/filing-scrapers`.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `FILING_CACHE_REDIS` | off | Enable Redis cache for browse/detail |
| `FILING_CACHE_VERSION` | `v1` | Bump to invalidate all filing cache keys |
| `FILING_CACHE_BROWSE_TTL_SEC` | `120` | Browse result TTL |
| `FILING_CACHE_DETAIL_TTL_SEC` | `300` | Detail page TTL |
| `FILING_ENRICH_BATCH_SIZE` | `20` | Post-import detail enrich cap per tick |
| `FILING_DELIST_ENABLED` | off | Archive listings missing from last crawl batch |
| `FILING_BROWSE_QUERY_MAX` | `5000` | Max rows loaded before client-side range filters |

## Ops commands

```bash
# Full 100-day sync: matrix → bulk discovery → list refresh → enrich → reconcile → audit
npm run import:filing-maskanyaban-full-sync

# 100-day campaign (same pipeline, resumable progress in tmp/)
npm run import:filing-maskanyaban-100d

# Re-crawl + upsert all listings in window (then enrich via backfill)
npm run import:filing-maskanyaban-refresh

# Detail enrich until queue empty (last 100 days)
npm run import:filing-maskanyaban-backfill

# Fix categorySlug / neighborhoodId for section matching
npm run import:filing-maskanyaban-reconcile

# Backfill maskanyaban detail fields (legacy)
npx tsx scripts/filing/ops/run-maskanyaban-detail-backfill.ts

# Scheduler tick (import + enrich + cache invalidation)
npm run filing-scrapers:scheduler
```

## npm scripts (filing)

| Script | Purpose |
|--------|---------|
| `test:filing-scrapers` | Full ingest + Python gate |
| `test:filing-golden` | Discovery golden (fixture HTML) |
| `test:filing-attributes` | Detail attribute parser |
| `test:filing-category-templates` | Per-kind content templates |
| `test:filing-list-card-specs` | Browse list card chips |
| `test:filing-field-parity` | TS ↔ Python field registry |
| `sync:filing-python-schema` | Regenerate Python schema from TS |
| `crawl:filing-maskanyaban-diverse` | Matrix crawl + optional DB import |
| `filing-scrapers:scheduler` | Due scraper tick loop |

## Adding a portal

1. Add blueprint under `lib/filing/ingest/blueprints/`.
2. Register in `lib/filing/ingest/portal-registry/`.
3. Capture `list-sample.html` + `expected.json` under `fixtures/filing-portals/{site}/`.
4. Extend Python parser in `filing_feed/` if HTML differs from maskanyaban.
5. Run `npm run test:filing-golden` and `test:filing-maskanyaban` (or site-specific test).

## Adding a category template

1. Edit `src/lib/filing/schema/category-templates.ts` (`browseListSpecKeys`, crawl required fields).
2. Run `npm run test:filing-category-templates`.
3. Run `npm run sync:filing-python-schema` and update `filing_category_templates.py` helpers if Python crawl checks need them.

## Demo gallery

`presentation/demo-gallery.ts` uses `public/filing/demo/*.webp` when `NODE_ENV=development` or `NEXT_PUBLIC_FILING_DEMO_GALLERY=true`.
