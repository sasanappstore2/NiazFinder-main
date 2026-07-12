# NiazFinder Crawler Platform

Enterprise-grade, **provider-agnostic** crawling platform.

| Version | Path | Status |
|---------|------|--------|
| **V3** | `crawler/v3/` | Current — modular platform, BullMQ, events, source registry |
| V2 | `crawler/` (root) | Maintained — Firecrawl-first, memory queue |
| Legacy | `estate-scrape` + `filing-scrapers` | Active fallback |

## Quick start

```bash
# V3 self-test (no external deps)
npm run test:crawler-v3

# Enable V3 in filing tick (uses legacy estate-scrape provider by default)
export CRAWLER_V3_ENABLED=true

# Firecrawl for public sources
export CRAWLER_DEFAULT_PROVIDER=firecrawl
export FIRECRAWL_API_KEY=fc-...
```

## Documentation

- [V3 Architecture](./docs/v3/ARCHITECTURE.md)
- [V3 Migration](./docs/v3/MIGRATION.md)
- [V3 Testing](./docs/v3/TESTING.md)
- [ADRs](./docs/adr/)
- [V2 Architecture](./docs/ARCHITECTURE.md)

## Public API (V3)

```typescript
import { CrawlerPlatformService } from '@crawler/v3';

const platform = CrawlerPlatformService.create();
await platform.startCrawl({ sourceId: 'maskanyaban-public' });
```

Filing import boundary unchanged: `ScrapedFilingRow` → `importScrapedFilings()`.
