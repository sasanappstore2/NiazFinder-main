# Filing system handoff — restored state

Persian real-estate **filings** (فایلینگ). Canonical doc: also see `docs/filing/ARCHITECTURE.md`.

## Restored on this branch (2026-07-10)

### Missing modules restored from commit `364cd16`
- `src/lib/business/real-estate-listing-*.ts` (+ listings helpers)
- `src/lib/business/is-real-estate-business.ts`
- `src/lib/business/normalize-property-listing.ts`
- `src/lib/business/widget-registry.ts`
- `src/lib/business/ecosystem/**`
- `src/lib/format/jalali-calendar.ts`
- `src/lib/api/format-api-error.ts`
- `src/lib/redis/client.ts`
- `src/components/ui/filters.tsx`
- `src/components/workspace/types.ts`
- `src/components/workspace/lib/normalize-workspace-data.ts`
- `src/lib/business/workspace/collaboration-posts.ts`

### UI / re-exports fixed
- `filingFilterPillClasses` re-exported from `BrowseFilterPill.tsx`
- `LayoutGrid` import in `super-admin-nav.ts`
- Deprecated re-exports: `week-sync`, `phone-reenrich`, `post-import-sync`, `stale-listings` under `src/lib/filing-scrapers/`

### npm scripts restored (40)
Including: `filing-scrapers:scheduler`, `import:filing-maskanyaban-*`, `audit:filing-coverage`, `test:filing-*`, `dev:estate-scrape` (already present).

## Runtime

```bash
# 1) App
npm run dev

# 2) Crawl engine (required for Run Now / enrich)
npm run dev:estate-scrape

# 3) Auto sync every scraper interval (maskanyaban = 180 min)
npm run filing-scrapers:scheduler
```

## Admin bot behavior (current code)

| Action | Behavior |
|--------|----------|
| **اجرا الان** | 7-day week sync (up to 2500), upsert, reconcile, background enrich + phones |
| **Scheduler tick** | Same week sync when due (`intervalMinutes`) |
| **Save password** | Background `reenrichFilingPhonesForScraper` (7 days) |

Scraper `maskanyaban` defaults: `intervalMinutes=180`, `jitterMinutes=10`, blueprint from `MASKANYABAN_BLUEPRINT`.

## Detail enrich / phones

- Detail pages on maskanyaban require broker login.
- Without `username` + `passwordEnc` in DB, enrich marks rows but cannot fetch `#ShowMelk` / phones.
- After credentials: Run Now or wait for phone reenrich after PATCH.

## Public / admin routes

| Path | Role |
|------|------|
| `/f` | Public browse |
| `/f/[id]` | Public detail |
| `/super-admin/filings` | Bots + imported filings |
| `GET /api/filings/browse` | Server browse API |
| `POST /api/super-admin/filing-scrapers/[id]/run` | Manual run |
| `POST /api/internal/filing-scrapers/tick` | Scheduler tick |

## Env

| Variable | Purpose |
|----------|---------|
| `FILING_SCRAPER_SECRET` | Encrypt bot passwords |
| `ESTATE_SCRAPE_SECRET` | Auth to estate-scrape |
| `FILING_CACHE_REDIS` | Optional Redis browse/detail cache |
| `FILING_DELIST_ENABLED` | Archive listings missing from crawl batch |
| `INTERNAL_API_SECRET` | Tick endpoint auth |

## Known limitation

List data (~50% completeness) works without portal login. Description, images, broker/owner phones need maskanyaban credentials in FilingsPanel → Edit bot.

## Live status after restore (2026-07-10)

| Check | Status |
|-------|--------|
| `GET /api/filings/browse` | 200 (DB has ~3007 active maskanyaban filings) |
| `/f` | 200 |
| `/super-admin/filings` | 200 |
| `estate-scrape :8200/health` | ok |
| Scraper `maskanyaban` | enabled, interval **180** min, no password yet |
| npm filing scripts | 40 restored |
| Missing modules from `364cd16` | restored (business/format/ecosystem/crawler/widgets/…) |

### After restore — operator steps
1. Keep `npm run dev` + `npm run dev:estate-scrape` running
2. Edit bot → enter maskanyaban username/password → save (triggers phone reenrich)
3. Click **اجرا الان** for 7-day sync
4. Run `npm run filing-scrapers:scheduler` for auto every 3h
