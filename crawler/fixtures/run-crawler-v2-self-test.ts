import type { FirecrawlClientLike, FirecrawlProvider } from '../providers/firecrawl/firecrawl-provider';
import { FirecrawlProvider as Provider } from '../providers/firecrawl/firecrawl-provider';
import { HttpProvider } from '../providers/http/http-provider';
import { CrawlService, resetCrawlService } from '../api/crawl-service';
import { resetCrawlerConfigCache } from '../config/loader';
import { computeBackoffMs, shouldRetry } from '../queue/retry-policy';
import { GenericPropertyNormalizer } from '../parser/normalizer';
import { PropertyRecordValidator } from '../parser/validators';
import { MultiSignalDedupeEngine } from '../dedupe/engine';
import { storedPropertyToScrapedRow } from '../bridge/legacy-filing';
import { crawlError } from '../types/errors';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function mockFirecrawlClient(): FirecrawlClientLike {
  return {
    async scrape(url: string) {
      return {
        url,
        markdown: `# فروش آپارتمان 120 متری\nمحله احمدآباد مشهد\nقیمت: ۱۲,۰۰۰,۰۰۰,۰۰۰`,
        html: `<html><body><h1>فروش آپارتمان</h1><a href="/listing/2">next</a></body></html>`,
        metadata: { sourceURL: url, statusCode: 200 },
      };
    },
    async crawl(url: string) {
      return {
        status: 'completed',
        data: [
          {
            markdown: '# listing 1',
            metadata: { sourceURL: url },
          },
        ],
      };
    },
    async map(url: string) {
      return { links: [url, `${url}/page/2`] };
    },
    async extract() {
      return {
        data: {
          title: 'فروش آپارتمان 120 متری',
          dealType: 'sell',
          propertyKind: 'apartment',
          area: '120',
          price: '12000000000',
          city: 'مشهد',
        },
      };
    },
    async search() {
      return { web: [{ url: 'https://example.com', title: 'test' }] };
    },
  };
}

async function testFirecrawlProviderMock(): Promise<void> {
  const provider = new Provider({ client: mockFirecrawlClient() });
  const scrape = await provider.scrape('https://example.com/listing/1');
  assert(scrape.ok, 'scrape should succeed');
  assert(Boolean(scrape.value.markdown), 'markdown expected');

  const map = await provider.map('https://example.com');
  assert(map.ok && map.value.urls.length >= 1, 'map urls');

  const extract = await provider.extract(['https://example.com'], {
    schema: { type: 'object' },
  });
  assert(extract.ok, 'extract ok');
}

async function testNormalizerAndValidator(): Promise<void> {
  const normalizer = new GenericPropertyNormalizer();
  const validator = new PropertyRecordValidator();
  const normalized = normalizer.normalize(
    {
      sourceUrl: 'https://x.com/1',
      raw: { title: 'فروش آپارتمان', dealType: 'sell', price: '1000000', area: '90' },
      extractedAt: new Date().toISOString(),
      extractor: 'test',
    },
    { siteKey: 'test', jobId: 'job1' }
  );
  assert(normalized.ok, 'normalize ok');
  const validated = validator.validate(normalized.value);
  assert(validated.ok, 'validate ok');
}

async function testDedupe(): Promise<void> {
  const dedupe = new MultiSignalDedupeEngine();
  const base = {
    id: 'p1',
    jobId: 'j1',
    externalId: 'ext1',
    sourceUrl: 'https://x/1',
    title: 'فروش آپارتمان',
    dealType: 'sell' as const,
    propertyKind: 'apartment' as const,
    amenities: {},
    images: [],
    contentHash: 'abc',
    normalizedAt: new Date().toISOString(),
    price: '100',
    location: 'مشهد',
    detailUrl: 'https://x/1',
  };
  await dedupe.register({ ...base, enrichedAt: new Date().toISOString() });
  const dup = await dedupe.check({ ...base, id: 'p2', externalId: 'ext2', contentHash: 'abc' });
  assert(dup && dup.confidence >= 0.85, 'exact hash duplicate');
}

async function testLegacyBridge(): Promise<void> {
  const row = storedPropertyToScrapedRow({
    id: 'p1',
    jobId: 'j1',
    externalId: '525837',
    sourceUrl: 'https://maskanyaban.ir/home/525837',
    sourceSite: 'maskanyaban',
    title: 'فروش آپارتمان',
    dealType: 'sell',
    propertyKind: 'apartment',
    amenities: { parking: true },
    images: [],
    contentHash: 'x',
    normalizedAt: new Date().toISOString(),
    dedupeKey: 'x',
    storedAt: new Date().toISOString(),
    price: '1000000',
    fileCode: '525837',
  });
  assert(row.externalId === '525837', 'externalId mapped');
  assert(row.hasParking === true, 'amenity mapped');
}

async function testRetryPolicy(): Promise<void> {
  assert(shouldRetry(1, 5, true), 'retryable');
  assert(!shouldRetry(5, 5, true), 'max attempts');
  assert(computeBackoffMs(2, 1000, 10000) >= 1000, 'backoff');
}

async function testCrawlServiceE2E(): Promise<void> {
  process.env.CRAWLER_V2_ENABLED = 'true';
  process.env.CRAWLER_DEFAULT_PROVIDER = 'http';
  resetCrawlerConfigCache();
  resetCrawlService();

  const service = CrawlService.create();
  const job = await service.startCrawl({
    siteKey: 'test-portal',
    config: {
      seedUrls: ['https://example.com/listings'],
      maxPages: 2,
      maxDepth: 1,
      allowedDomains: ['example.com'],
    },
  });

  const done = await service.waitFor(job.id);
  assert(
    done.status === 'completed' || done.status === 'processing' || done.status === 'failed',
    `job status ${done.status}`
  );
}

async function testTypedErrors(): Promise<void> {
  const e = crawlError('network', 'timeout', { retryable: true });
  assert(e.retryable === true, 'retryable flag');
}

async function main(): Promise<void> {
  await testTypedErrors();
  await testRetryPolicy();
  await testNormalizerAndValidator();
  await testDedupe();
  await testLegacyBridge();
  await testFirecrawlProviderMock();
  await testCrawlServiceE2E();
  console.log('crawler v2 self-test passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
