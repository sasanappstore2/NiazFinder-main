# Architecture — Crawl Engine V2

## Design principles

1. **Providers are dumb transports** — no deal-type logic, no Persian parsing, no DB writes.
2. **Pipeline stages are independent** — each stage has a narrow interface; swap or disable via config.
3. **Raw data is immutable** — append-only raw page store; reprocessing never deletes source HTML.
4. **AI enriches, never crawls** — crawling is always provider-driven.
5. **Stable downstream contract** — `ScrapedFilingRow` bridge preserves `runner.ts` + `RegionalFiling` import.

## Module map

```
┌─────────────────────────────────────────────────────────────┐
│ CrawlService (api/)                                          │
│  startCrawl · pause · resume · cancel · status · history     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ CrawlEngineV2 (core/)                                        │
│  DiscoveryEngine → ExtractionPipeline (per URL, streaming)   │
└─────┬───────────────────────────────────────────────┬───────┘
      │                                               │
┌─────▼─────┐  ┌──────────┐  ┌─────────┐  ┌─────────▼────────┐
│ Queue     │  │ Provider │  │ Parser  │  │ Storage layers   │
│ retry/DLQ │  │ registry │  │ norm/val│  │ raw/extract/prop │
└───────────┘  └────┬─────┘  └─────────┘  └──────────────────┘
                    │
         ┌──────────┼──────────┬─────────────┐
         ▼          ▼          ▼             ▼
    Firecrawl   Playwright    HTTP      (future: Cheerio)
```

## Provider interface

Every provider implements `CrawlerProvider`:

- `scrape(url)` — single page
- `crawl(seed)` — recursive site crawl
- `map(url)` — URL discovery
- `extract(urls, schema)` — structured JSON
- `search(query)` — web search
- `health()` — latency probe

Business logic lives in `parser/` + `pipeline/`, not in providers.

## Storage layers

| Layer | Content | Overwrite |
|-------|---------|-----------|
| Raw | HTML, markdown, metadata hash | Never |
| Extraction | Provider/heuristic JSON | Append |
| Normalized | Internal `NormalizedProperty` | Versioned via new job |
| Enriched | Keywords, embeddings, geo | Optional |
| Stored | Dedupe key + DB-ready record | Upsert via bridge |

## Monitoring metrics

- pages crawled / failed
- success rate, duplicate rate
- validation rejections
- provider latency
- queue length, retries
- estimated cost (Firecrawl — future hook)

## Scalability path

| Phase | Queue | Storage | Providers |
|-------|-------|---------|-----------|
| **Now** | In-memory + job store | In-memory / file | Firecrawl + HTTP + Playwright bridge |
| **Next** | Redis / BullMQ | S3 raw + Postgres meta | Same interfaces |
| **Scale** | Distributed workers | Object store + pgvector | Regional Firecrawl proxies |

## Error taxonomy

All modules return `CrawlError` with codes: `retryable`, `fatal`, `temporary`, `validation`, `network`, `provider`, `parsing`, `database`, `queue`, `config`, `cancelled`.

Queue applies exponential backoff + dead-letter on exhausted retries.
