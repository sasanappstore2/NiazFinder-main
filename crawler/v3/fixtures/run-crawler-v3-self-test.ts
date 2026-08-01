#!/usr/bin/env npx tsx
/**
 * Crawler Platform V3 — contract & integration self-test.
 * Run: npm run test:crawler-v3
 */
import { resetPlatformConfigV3 } from '../config/loader';
import { bootstrapV3Providers, createV3Provider } from '../providers/registry';
import { SourceRegistry } from '../registry/source-registry';
import { CrawlScheduler } from '../scheduler/crawl-scheduler';
import { InMemoryEventBus } from '../events/event-bus';
import { LayeredCrawlStorage } from '../storage/layered-storage';
import { EnrichmentPipeline } from '../ai/enrichment-pipeline';
import { PassthroughAiEnricher } from '../../ai/enricher';
import { PrometheusMetricsExporter } from '../monitoring/prometheus';
import type { NormalizedProperty } from '../domain/property';
import type { FirecrawlClientLike } from '../../providers/firecrawl/firecrawl-provider';
import { FirecrawlProvider } from '../../providers/firecrawl/firecrawl-provider';
import { BaseProviderAdapter } from '../sdk/base-provider';
import { mergeCapabilities } from '../sdk/capabilities';

function mockFirecrawl(): FirecrawlClientLike {
  return {
    scrape: async (url: string) => ({
      success: true,
      data: { markdown: `# Listing\nprice: 1B`, metadata: { sourceURL: url } },
    }),
    crawl: async () => ({ success: true, data: [] }),
    map: async () => ({ success: true, links: ['https://example.com/a', 'https://example.com/b'] }),
    extract: async () => ({ success: true, data: { title: 'Test' } }),
    search: async () => ({ success: true, data: [] }),
  };
}

async function testFirecrawlContract(): Promise<void> {
  const inner = new FirecrawlProvider({ client: mockFirecrawl() });
  const provider = new BaseProviderAdapter(
    inner,
    mergeCapabilities(
      {
        authentication: false,
        javascript: true,
        streaming: false,
        screenshots: true,
        structuredExtraction: true,
        pagination: true,
        incremental: true,
        rateLimiting: true,
        sitemapDiscovery: true,
        linkDiscovery: true,
        markdown: true,
        rawHtml: true,
      },
      {}
    )
  );

  assert(provider.supportsStructuredExtraction(), 'firecrawl structured extraction');
  const health = await provider.health();
  assert(health.healthy, 'firecrawl health');
  const map = await provider.discover('https://example.com');
  assert(map.ok && map.value.urls.length === 2, 'firecrawl discover/map');
  console.log('[OK] Firecrawl provider contract');
}

async function testSourceRegistry(): Promise<void> {
  resetPlatformConfigV3();
  const { loadPlatformConfigV3 } = await import('../config/loader');
  const config = loadPlatformConfigV3();
  const registry = new SourceRegistry(config, {
    sourcesPath: 'crawler/v3/config/sources.example.json',
  });
  const sources = registry.list(true);
  assert(sources.length >= 1, 'sources loaded');
  const scheduler = new CrawlScheduler(config, registry);
  const due = scheduler.tick();
  assert(due.length >= 1, 'due sources');
  console.log('[OK] Source registry + scheduler');
}

async function testEventBus(): Promise<void> {
  const bus = new InMemoryEventBus();
  let count = 0;
  bus.subscribe('PageDiscovered', () => {
    count += 1;
  });
  await bus.publish({
    type: 'PageDiscovered',
    eventId: 'e1',
    occurredAt: new Date().toISOString(),
    jobId: 'j1',
    sourceId: 's1',
    url: 'https://example.com',
    depth: 0,
  });
  assert(count === 1, 'event handler');
  console.log('[OK] Event bus');
}

async function testEnrichmentPipeline(): Promise<void> {
  const pipeline = new EnrichmentPipeline(
    { enabled: true, tasks: ['keyword-generation', 'confidence-scoring'] },
    new PassthroughAiEnricher(true)
  );
  const property: NormalizedProperty = {
    id: 'p1',
    jobId: 'j1',
    externalId: 'ext1',
    sourceUrl: 'https://example.com',
    title: 'فروش آپارتمان ۱۰۰ متری',
    dealType: 'sell',
    propertyKind: 'apartment',
    amenities: {},
    images: [],
    contentHash: 'abc',
    normalizedAt: new Date().toISOString(),
  };
  const result = await pipeline.enrich(property);
  assert(result.ok && (result.value.keywords?.length ?? 0) > 0, 'enrichment keywords');
  console.log('[OK] AI enrichment pipeline');
}

async function testLayeredStorage(): Promise<void> {
  const { loadPlatformConfigV3 } = await import('../config/loader');
  const storage = new LayeredCrawlStorage(loadPlatformConfigV3());
  storage.appendRaw({
    id: 'r1',
    jobId: 'j1',
    url: 'https://example.com',
    fetchedAt: new Date().toISOString(),
    provider: 'http',
    html: '<html></html>',
    contentHash: 'hash1',
  });
  storage.appendRaw({
    id: 'r2',
    jobId: 'j1',
    url: 'https://example.com',
    fetchedAt: new Date().toISOString(),
    provider: 'http',
    html: '<html></html>',
    contentHash: 'hash1',
  });
  assert(storage.snapshot.rawHtml.length === 1, 'raw dedupe by hash');
  console.log('[OK] Layered storage immutability');
}

async function testPrometheus(): Promise<void> {
  const { loadPlatformConfigV3 } = await import('../config/loader');
  const prom = new PrometheusMetricsExporter(loadPlatformConfigV3());
  prom.providerLatency('firecrawl', 'scrape', 120);
  prom.queueSize(3);
  const text = prom.exportText();
  assert(text.includes('niazfinder_crawler_provider_latency_ms'), 'prometheus export');
  console.log('[OK] Prometheus metrics');
}

async function testProviderRegistry(): Promise<void> {
  const { loadPlatformConfigV3 } = await import('../config/loader');
  const config = loadPlatformConfigV3();
  bootstrapV3Providers(config);
  const names = ['firecrawl', 'http', 'playwright', 'api', 'estate-scrape-legacy', 'future-browser'];
  for (const name of names) {
    const p = createV3Provider(name, config);
    assert(p.name === name, `provider ${name}`);
  }
  console.log('[OK] Provider registry');
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function testWeightedDedupe(): Promise<void> {
  const { WeightedDedupeStage } = await import('../dedupe/weighted-engine');
  const dedupe = new WeightedDedupeStage(0.7);
  const base = {
    id: 'p1',
    jobId: 'j1',
    externalId: 'ext-100',
    sourceUrl: 'https://example.com/1',
    title: 'فروش آپارتمان',
    dealType: 'sell' as const,
    propertyKind: 'apartment' as const,
    amenities: {},
    images: [],
    contentHash: 'hash1',
    normalizedAt: new Date().toISOString(),
  };
  await dedupe.register({ ...base, dedupeKey: 'k1', storedAt: new Date().toISOString() });
  const match = await dedupe.check({ ...base, id: 'p2', externalId: 'ext-100' });
  assert(match !== null && match.confidence >= 0.7, 'weighted dedupe external_id');
  console.log('[OK] Weighted deduplication');
}

async function testExtractionStrategies(): Promise<void> {
  const { resolveExtractionStage } = await import('../extraction/strategy-registry');
  const stage = resolveExtractionStage('firecrawl-extract');
  const result = await stage.extract({
    jobId: 'j1',
    sourceId: 's1',
    url: 'https://example.com',
    strategy: 'firecrawl-extract',
    scrape: { url: 'https://example.com', metadata: { title: 'Test' }, latencyMs: 1 },
  });
  assert(result.ok && result.value.length === 1, 'firecrawl extract strategy');
  console.log('[OK] Extraction strategy registry');
}

async function testMockPlaywright(): Promise<void> {
  const { MockPlaywrightProvider } = await import('./mocks/mock-playwright-provider');
  const p = new MockPlaywrightProvider();
  assert(p.supportsAuthentication() && p.supportsJavaScript(), 'playwright capabilities');
  const scrape = await p.scrape('https://mock.local/x');
  assert(scrape.ok, 'mock playwright scrape');
  console.log('[OK] Mock Playwright contract');
}

async function testAnalyticsAndSearch(): Promise<void> {
  const { EventAnalyticsStage } = await import('../analytics/event-collector');
  const { InMemorySearchIndexStage } = await import('../search/index-publisher');
  const analytics = new EventAnalyticsStage();
  await analytics.recordEvent({
    type: 'EntityCreated',
    eventId: 'e1',
    occurredAt: new Date().toISOString(),
    jobId: 'j1',
    sourceId: 's1',
    propertyId: 'p1',
    externalId: 'ext1',
  });
  assert(analytics.snapshot().length > 0, 'analytics counters');
  const index = new InMemorySearchIndexStage();
  await index.index({
    id: 'p1',
    jobId: 'j1',
    externalId: 'ext1',
    sourceUrl: 'https://example.com',
    title: 'Test',
    dealType: 'sell',
    propertyKind: 'apartment',
    amenities: {},
    images: [],
    contentHash: 'c',
    dedupeKey: 'd',
    storedAt: new Date().toISOString(),
    normalizedAt: new Date().toISOString(),
  });
  assert(index.all().length === 1, 'search index');
  console.log('[OK] Analytics + search index');
}

async function main(): Promise<void> {
  await testProviderRegistry();
  await testFirecrawlContract();
  await testSourceRegistry();
  await testEventBus();
  await testEnrichmentPipeline();
  await testLayeredStorage();
  await testPrometheus();
  await testWeightedDedupe();
  await testExtractionStrategies();
  await testMockPlaywright();
  await testAnalyticsAndSearch();
  console.log('\ncrawler-v3 self-test passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
