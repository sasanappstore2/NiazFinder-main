# Crawler V3 — Migration Guide

## Principles

1. **No big-bang rewrite** — V3 runs behind `CRAWLER_V3_ENABLED`.
2. **Stable DB boundary** — `ScrapedFilingRow` + `importScrapedFilings()` unchanged.
3. **Adapters, not forks** — `estate-scrape` becomes `EstateScrapeLegacyProvider`.
4. **Gradual provider migration** — move sources one-by-one in `sources.json`.

## Flag matrix

| Flag | Default | Effect |
|------|---------|--------|
| `CRAWLER_V3_ENABLED` | `false` | Use V3 platform in filing tick |
| `CRAWLER_V2_ENABLED` | `false` | V2 if V3 off |
| *(none)* | — | Legacy `estate-scrape` HTTP client |

Priority: **V3 > V2 > Legacy**

## Step 1 — Enable V3 with legacy provider

```bash
CRAWLER_V3_ENABLED=true
ESTATE_SCRAPE_URL=http://127.0.0.1:8200
```

No Firecrawl key required. Filing tick uses `EstateScrapeLegacyProvider`.

## Step 2 — Register declarative sources

Copy `crawler/v3/config/sources.example.json` → `crawler/v3/config/sources.json`:

```bash
export CRAWLER_SOURCES_PATH=crawler/v3/config/sources.json
```

Each source declares provider, discovery strategy, extraction strategy, schedules.

## Step 3 — Introduce Firecrawl for public sources

```bash
CRAWLER_DEFAULT_PROVIDER=firecrawl
FIRECRAWL_API_KEY=fc-...
```

Update source entry:

```json
{
  "id": "example-public",
  "provider": "firecrawl",
  "discoveryStrategy": "map-api",
  "extractionStrategy": "firecrawl-extract"
}
```

## Step 4 — Distributed queue (optional)

```bash
CRAWLER_QUEUE_DRIVER=bullmq
CRAWLER_REDIS_URL=redis://127.0.0.1:6379
npm run worker:crawler-v3   # (add worker script when deploying)
```

## Deprecation timeline

| Component | Status | Replacement |
|-----------|--------|-------------|
| Direct `fetchFilingFeedScrape` in runner | Active | `scrapeFilingFeedV3` |
| `CrawlEngineV2` | Maintained | `CrawlPipelineOrchestrator` |
| Python orchestration in `filing_feed/scraper.py` | Active | Shrinks per portal via providers |
| ScrapeGraph onboard | Active | Firecrawl extract + DOM parsers |

## Compatibility checklist

- [ ] `npm run test:crawler-v3` passes
- [ ] `npm run test:filing-maskanyaban` still passes (legacy path)
- [ ] Super-admin filing scraper tick imports rows
- [ ] `CRAWLER_V3_ENABLED=true` smoke on one scraper
- [ ] Firecrawl billing alerts configured (if used)

## Rollback

```bash
unset CRAWLER_V3_ENABLED
# or CRAWLER_V3_ENABLED=false
```

Tick immediately reverts to V2 or legacy HTTP client.
