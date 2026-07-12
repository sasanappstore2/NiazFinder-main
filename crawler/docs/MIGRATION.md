# Migration Guide — estate-scrape → Crawl Engine V2

## Summary

V2 runs **alongside** the Python `estate-scrape` service. No routes or DB schemas are removed. Enable gradually with feature flags.

## Phase 0 — Today (shipped)

- New package: `crawler/`
- APIs: `/api/super-admin/crawler-v2/*`
- Bridge: `storedProperty → ScrapedFilingRow`
- Runner hook: `CRAWLER_V2_ENABLED=true` → `scrapeFilingFeedV2()`

**Default: V2 off.** Existing ticks and admin runs use `estate-scrape`.

## Phase 1 — Shadow mode

1. Set `CRAWLER_V2_ENABLED=true` on a staging environment.
2. Run manual scraper jobs; compare `RegionalFiling` rows with legacy import.
3. Monitor `/api/super-admin/crawler-v2/health`.

## Phase 2 — Provider cutover per portal

| Portal | Recommended provider | Notes |
|--------|---------------------|-------|
| Public listing sites | `firecrawl` | map + extract + scrape |
| AJAX portals (maskanyaban) | `http` or legacy | Until Firecrawl actions support POST |
| Auth-required portals | `playwright` bridge | Uses estate-scrape until Firecrawl interact |

Configure per job:

```json
{
  "siteKey": "maskanyaban",
  "config": {
    "seedUrls": ["https://maskanyaban.ir/estate/all/all/"],
    "provider": "http",
    "maxPages": 100
  }
}
```

## Phase 3 — Decommission Python crawl paths

When parity is proven:

1. Move remaining portal adapters to `parser/` site-specific plugins (not providers).
2. Retire `filing_feed/scraper.py` production path.
3. Keep `estate-scrape` for `business_import` and dataset builder only.

## Breaking change policy

| Contract | Status |
|----------|--------|
| `ScrapedFilingRow` | **Frozen** — bridge guarantees shape |
| `importScrapedFilings()` | **Unchanged** |
| `POST /v1/filing-feed/scrape` | **Kept** until Phase 3 |
| Admin scraper CRUD | **Unchanged** |

## Rollback

```bash
unset CRAWLER_V2_ENABLED
# or
export CRAWLER_V2_ENABLED=false
```

Runner immediately reverts to `estate-scrape` HTTP client.

## ENV reference

| Variable | Purpose |
|----------|---------|
| `CRAWLER_V2_ENABLED` | Enable runner bridge |
| `CRAWLER_DEFAULT_PROVIDER` | `firecrawl` \| `http` \| `playwright` |
| `FIRECRAWL_API_KEY` | Firecrawl SDK |
| `CRAWLER_CONFIG_PATH` | JSON config overlay |
| `CRAWLER_QUEUE_CONCURRENCY` | Parallel jobs |
| `CRAWLER_AI_ENRICHMENT` | AI post-process |
| `CRAWLER_LEGACY_FALLBACK` | Allow estate-scrape fallback |

## Checklist before production

- [ ] Firecrawl API key + billing alerts
- [ ] Portal-specific `extractSchema` in job config
- [ ] Dedupe thresholds tuned per city
- [ ] Rate limits aligned with portal ToS
- [ ] Self-test green: `npm run test:crawler-v2`
