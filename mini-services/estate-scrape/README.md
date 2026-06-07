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
```

## Merge with real-estate need dataset

```bash
npm run dataset:merge-estate-training
```

Uses `INTAKE_MLX_DATASET_PATH` for training after merge.
