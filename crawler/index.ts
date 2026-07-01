/**
 * NiazFinder Crawl Engine V2
 * Firecrawl-first, provider-pluggable crawling platform.
 */

export * from './types';
export * from './interfaces';
export * from './config/schema';
export { loadCrawlerConfig, getCrawlerConfig, resetCrawlerConfigCache } from './config/loader';
export { bootstrapProviders, createProvider, listProviders } from './providers/registry';
export { FirecrawlProvider, createFirecrawlClient } from './providers/firecrawl/firecrawl-provider';
export { HttpProvider } from './providers/http/http-provider';
export { PlaywrightProvider } from './providers/playwright/playwright-provider';
export { CrawlEngineV2 } from './core/crawl-engine';
export { UrlDiscoveryEngine, buildDiscoveryOptions } from './core/discovery-engine';
export { ExtractionPipeline } from './pipeline/extraction-pipeline';
export { CrawlService, getCrawlService, resetCrawlService } from './api/crawl-service';
export { storedPropertyToScrapedRow, storedPropertiesToScrapedRows } from './bridge/legacy-filing';
export { scrapeFilingFeedV2, isCrawlerV2Enabled } from './bridge/v2-runner-adapter';

/** V3 platform — explicit exports to avoid clashing with V2 `DedupeSignal` */
export {
  CrawlerPlatformService,
  getCrawlerPlatformService,
  resetCrawlerPlatformService,
  isCrawlerV3Enabled,
  loadPlatformConfigV3,
  getPlatformConfigV3,
  loadSourcesFromFile,
  loadSourcesFromYaml,
  scrapeFilingFeedV3,
  isCrawlerPlatformV3Enabled,
  SourceRegistry,
  CrawlScheduler,
  CrawlPipelineOrchestrator,
  createCrawlQueueV3,
} from './v3';
export type { PlatformConfigV3, CrawlSource, Property, StoredProperty, DomainEvent, DomainEventType } from './v3';
