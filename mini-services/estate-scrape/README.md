# Estate Scrape (ScrapeGraphAI + Qwen 3.5-2B)

Persian real-estate knowledge dataset builder using:

- **ScrapeGraphAI** (`/Scrapegraph-ai-main`) — web search + smart scrape
- **Qwen 3.5-2B** via `mini-services/intake-mlx` — article extraction & Q&A

## Setup

```bash
# 1) Start Qwen (required)
npm run dev:intake-mlx

# 2) Install estate-scrape + ScrapeGraphAI
npm run setup:estate-scrape

# 3) Optional: Playwright for JS-heavy sites
cd mini-services/estate-scrape && .venv/bin/playwright install chromium
```

## Build 10k dataset

```bash
npm run dataset:estate-knowledge-10k
```

Output:

- `data/need-intake-training/estate-knowledge-10k.jsonl`
- `data/need-intake-training/estate-knowledge-holdout.jsonl`
- `data/estate-knowledge/manifest.json`

## API (optional)

```bash
npm run dev:estate-scrape
# POST http://127.0.0.1:8200/v1/build-dataset
# POST http://127.0.0.1:8200/v1/scrape-url  {"url":"..."}
# POST http://127.0.0.1:8200/v1/business-import/preview
#   {"url":"https://example.com","hintBlueprintId":"online_store","occupationSlugs":[]}
```

### Business site import preview

Requires `intake-mlx` (Qwen on port 8100). The Next.js app proxies authenticated requests to this endpoint via `ESTATE_SCRAPE_URL` (default `http://127.0.0.1:8200`).

```bash
curl -s http://127.0.0.1:8200/health | jq
curl -s -X POST http://127.0.0.1:8200/v1/business-import/preview \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}' | jq
```

Returns `siteType`, `blueprintId` (`online_store` | `company`), `confidence`, `pagesScraped`, and `suggestions[]` for user review before apply.

Optional: set `ESTATE_SCRAPE_SECRET` in both Next.js (`.env.local`) and the estate-scrape process; Next sends `x-estate-scrape-secret` on preview requests.

## Merge with real-estate need dataset

```bash
npm run dataset:merge-estate-training
```

Uses `INTAKE_MLX_DATASET_PATH` for training after merge.

## Vendored dependency: Scrapegraph-ai-main

`/Scrapegraph-ai-main` is an intentionally vendored snapshot of
[ScrapeGraphAI/Scrapegraph-ai](https://github.com/ScrapeGraphAI/Scrapegraph-ai)
at `2.2.0b1` (a beta not published to PyPI, so it cannot be pip-installed).
It is MIT-licensed (see its own `LICENSE`) and installed editable via
`npm run setup:estate-scrape`. Do not upgrade it in place — re-vendor from
upstream and re-run the estate self-tests instead.
