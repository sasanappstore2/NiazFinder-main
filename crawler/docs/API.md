# Crawl Service API

Base path: `/api/super-admin/crawler-v2`

Auth: super-admin permissions `market:filings:read` / `market:filings:write`

## POST /jobs — startCrawl

```json
{
  "siteKey": "maskanyaban",
  "priority": "normal",
  "config": {
    "seedUrls": ["https://maskanyaban.ir/estate/all/all/"],
    "provider": "firecrawl",
    "maxPages": 50,
    "maxDepth": 2,
    "allowedDomains": ["maskanyaban.ir"],
    "includePatterns": ["/home/"],
    "excludePatterns": ["/login"],
    "aiEnrichment": false,
    "deduplication": true,
    "extractSchema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "price": { "type": "string" },
        "area": { "type": "string" }
      }
    }
  }
}
```

Response: `{ ok: true, job: CrawlJob }`

## GET /jobs — history + health

Returns `{ ok, health, history: CrawlJobSnapshot[] }`

## GET /jobs/{jobId} — status

Returns `{ ok, job, metrics }`

## PATCH /jobs/{jobId}

```json
{ "action": "pause" | "resume" | "cancel" }
```

## GET /health — providerHealth

Returns Firecrawl (or configured provider) health probe.

## Programmatic (in-process)

```typescript
import { CrawlService } from '@crawler/api/crawl-service';

const service = CrawlService.create();
const job = await service.startCrawl({ siteKey: 'x', config: { seedUrls: ['https://...'] } });
await service.waitFor(job.id);
const status = await service.status(job.id);
```

## reindex(jobId)

Rebuilds search indexes from stored properties (stub — extend for Typesense/pgvector).
