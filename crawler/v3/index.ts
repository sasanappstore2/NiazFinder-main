/**
 * NiazFinder Crawler Platform V3 — public API surface.
 */
export { CrawlerPlatformService, getCrawlerPlatformService, resetCrawlerPlatformService } from './api/platform-service';
export { isCrawlerV3Enabled, loadPlatformConfigV3, getPlatformConfigV3 } from './config/loader';
export { loadSourcesFromFile, loadSourcesFromYaml } from './config/yaml-loader';
export { scrapeFilingFeedV3, isCrawlerPlatformV3Enabled } from './bridge/v3-runner-adapter';

export type { CrawlProviderContract } from './sdk/provider-contract';
export type { ProviderCapabilities } from './sdk/capabilities';
export type { CrawlSource } from './domain/crawl-source';
export type { Property, StoredProperty } from './domain/property';
export type { DomainEvent, DomainEventType } from './domain/events';
export type { PlatformConfigV3 } from './config/schema';

export * from './interfaces';

export { SourceRegistry } from './registry/source-registry';
export { CrawlScheduler } from './scheduler/crawl-scheduler';
export { CrawlPipelineOrchestrator } from './pipeline/orchestrator';
export { LayeredCrawlStorage } from './storage/layered-storage';
export { LayeredPersistenceStage } from './persistence/layered-persistence-stage';
export { InMemoryEventBus } from './events/event-bus';
export { EnrichmentPipeline } from './ai/enrichment-pipeline';
export { PrometheusMetricsExporter } from './monitoring/prometheus';
export { EventAnalyticsStage } from './analytics/event-collector';
export { InMemorySearchIndexStage, NoopSearchIndexStage } from './search/index-publisher';
export { WeightedDedupeStage } from './dedupe/weighted-engine';
export { V3DiscoveryStage } from './discovery/v3-discovery-stage';
export { resolveExtractionStage } from './extraction/strategy-registry';
export { bootstrapV3Providers, createV3Provider, listV3Providers } from './providers/registry';
export { ApiProvider } from './providers/api/api-provider';
export { EstateScrapeLegacyProvider } from './providers/legacy/estate-scrape-provider';
export { FutureBrowserProvider } from './providers/future-browser/future-browser-provider';
export { createCrawlQueueV3 } from './queue/queue-factory';
