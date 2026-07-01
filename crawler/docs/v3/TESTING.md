# Crawler V3 — Testing Strategy

## Target

>90% coverage on `crawler/v3/**` (unit + contract + pipeline).

## Test layers

| Layer | Command | Scope |
|-------|---------|-------|
| Unit | `npm run test:crawler-v3` | SDK, registry, events, storage, metrics |
| Contract | `test:crawler-v3` (Firecrawl mock) | Provider interface compliance |
| Integration | `test:filing-maskanyaban:import` | Legacy provider → DB |
| Pipeline | V3 self-test + future snapshot tests | Orchestrator stages |
| Performance | Manual benchmark script (TBD) | Provider latency baselines |

## Mocking rules

- **Firecrawl**: inject `FirecrawlClientLike` — never hit API in CI
- **Playwright / Legacy**: mock `fetch` to estate-scrape fixtures
- **BullMQ**: skip if `bullmq` not installed; memory queue always runs
- **Redis**: optional — tests use `memory` driver

## Contract tests (providers)

Each provider must pass:

1. `health()` returns `healthy: true` (or structured failure)
2. `scrape()` / `fetch()` returns `Result<ScrapeResult>`
3. Capability flags match implementation
4. `toRawPage()` produces stable `contentHash`
5. No business logic (no Persian parsing, no DB writes)

## Snapshot tests (planned)

```
crawler/v3/fixtures/snapshots/
  maskanyaban-list-normalized.json
  firecrawl-extract-normalized.json
```

## CI gate (recommended)

```yaml
- run: npm run test:crawler-v3
- run: npm run test:crawler-v2
- run: npm run test:filing-maskanyaban
```

## Local dev

```bash
npm run test:crawler-v3
CRAWLER_V3_ENABLED=true npm run test:filing-maskanyaban:import
```
