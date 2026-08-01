# Provider Guide

## Registry

Providers register in `providers/registry.ts`. Switch via config — no code changes:

```bash
export CRAWLER_DEFAULT_PROVIDER=firecrawl
```

## Firecrawl (primary)

Wrapper: `providers/firecrawl/firecrawl-provider.ts`

- Never import `firecrawl` outside this module.
- SDK loaded dynamically; tests inject `FirecrawlClientLike` mock.
- Install: `npm install firecrawl`

```typescript
import { FirecrawlProvider } from '@crawler/providers/firecrawl/firecrawl-provider';

const provider = new FirecrawlProvider({ apiKey: process.env.FIRECRAWL_API_KEY });
const result = await provider.scrape('https://example.com', { formats: ['markdown', 'html'] });
```

### When to use

- JS-heavy sites
- Large-scale map + crawl
- Structured `extract()` with JSON schema
- Anti-bot handled by Firecrawl infra

### antiBot in blueprint

Portal-specific rate limits remain in `CrawlBlueprint.antiBot` for **HTTP/legacy** paths. Firecrawl provider ignores business antiBot — use Firecrawl's own limits.

## HTTP (custom crawler)

- Direct `fetch` with browser-like headers
- Link extraction for discovery fallback
- No `extract` / `search` — use pipeline heuristics or Firecrawl extract stage

## Playwright (legacy bridge)

- Delegates to `estate-scrape` `/v1/scrape-url`
- Use for authenticated portals until Firecrawl `interact` is wired
- **No business logic** — transport only

## Adding a new provider

1. Implement `CrawlerProvider` in `providers/{name}/`.
2. Register in `bootstrapProviders()`.
3. Add to `providerNameSchema` in `config/schema.ts`.
4. Add mock + unit tests.
5. Document in this file.

```typescript
export class CheerioProvider implements CrawlerProvider {
  readonly name = 'cheerio';
  // scrape, crawl, map, extract, search, health, toRawPage
}
```

## Health checks

```bash
curl -H "Cookie: ..." http://localhost:3000/api/super-admin/crawler-v2/health
```

Or programmatically:

```typescript
const health = await CrawlService.create().providerHealth('firecrawl');
```
