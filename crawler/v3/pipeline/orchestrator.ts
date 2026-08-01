import type { CrawlJob } from '../../types/crawl-job';
import type { CrawlJobConfigV3 } from '../config/schema';
import type { PlatformConfigV3 } from '../config/schema';
import type { CrawlProviderContract } from '../sdk/provider-contract';
import type { CrawlQueue, JobStore } from '../../interfaces/queue';
import type { EventBus } from '../events/event-bus';
import { buildDiscoveryOptions, UrlDiscoveryEngine } from '../../core/discovery-engine';
import { ExtractionPipeline } from '../../pipeline/extraction-pipeline';
import { GenericPropertyNormalizer } from '../../parser/normalizer';
import { PropertyRecordValidator } from '../../parser/validators';
import { MultiSignalDedupeEngine } from '../../dedupe/engine';
import { PassthroughAiEnricher } from '../../ai/enricher';
import { InMemoryCrawlStorage } from '../../storage/memory-store';
import { InMemoryMetricsCollector } from '../../monitoring/metrics-collector';
import { LayeredCrawlStorage } from '../storage/layered-storage';
import { EnrichmentPipeline } from '../ai/enrichment-pipeline';
import { PrometheusMetricsExporter } from '../monitoring/prometheus';
import { newId } from '../../core/utils';
import type { CrawlerProvider } from '../../interfaces/crawler-provider';
import { storedPropertiesToScrapedRows } from '../../bridge/legacy-filing';

export type OrchestratorDeps = {
  config: PlatformConfigV3;
  provider: CrawlProviderContract;
  queue: CrawlQueue;
  jobStore: JobStore;
  events: EventBus;
  storage?: LayeredCrawlStorage;
  metrics?: PrometheusMetricsExporter;
};

/**
 * V3 pipeline orchestrator — wires discovery → fetch → extract → normalize →
 * validate → dedupe → enrich → persist with domain events.
 */
export class CrawlPipelineOrchestrator {
  private readonly pipeline = new ExtractionPipeline();
  private readonly discovery: UrlDiscoveryEngine;
  private readonly normalizer = new GenericPropertyNormalizer();
  private readonly validator = new PropertyRecordValidator();
  private readonly dedupe = new MultiSignalDedupeEngine();
  private readonly layered: LayeredCrawlStorage;
  private readonly legacyStorage = new InMemoryCrawlStorage();
  private readonly legacyMetrics = new InMemoryMetricsCollector();
  private readonly prom: PrometheusMetricsExporter;

  constructor(private readonly deps: OrchestratorDeps) {
    this.discovery = new UrlDiscoveryEngine(deps.provider as unknown as CrawlerProvider);
    this.layered = deps.storage ?? new LayeredCrawlStorage(deps.config);
    this.prom = deps.metrics ?? new PrometheusMetricsExporter(deps.config);
  }

  createJob(sourceId: string, jobConfig: CrawlJobConfigV3, priority: CrawlJob['priority'] = 'normal'): CrawlJob {
    const now = new Date().toISOString();
    return {
      id: newId('job'),
      siteKey: sourceId,
      status: 'pending',
      priority,
      config: {
        seedUrls: jobConfig.seedUrls,
        provider: jobConfig.provider ?? this.deps.config.defaultProvider,
        maxPages: jobConfig.maxPages,
        maxDepth: jobConfig.maxDepth,
        concurrency: jobConfig.concurrency ?? this.deps.config.queue.concurrency,
        rateLimitPerMinute: jobConfig.rateLimitPerMinute ?? this.deps.config.queue.rateLimitPerMinute,
        includePatterns: jobConfig.includePatterns,
        excludePatterns: jobConfig.excludePatterns,
        allowedDomains: jobConfig.allowedDomains,
        respectRobotsTxt: jobConfig.respectRobotsTxt ?? this.deps.config.discovery.respectRobotsTxt,
        incremental: jobConfig.incremental,
        aiEnrichment: jobConfig.aiEnrichment ?? this.deps.config.pipeline.aiEnrichment,
        deduplication: jobConfig.deduplication ?? this.deps.config.pipeline.deduplication,
        parserId: jobConfig.parserId,
        extractSchema: jobConfig.extractSchema,
        metadata: jobConfig.metadata,
      },
      progress: {
        pagesDiscovered: 0,
        pagesCrawled: 0,
        pagesFailed: 0,
        listingsExtracted: 0,
        listingsStored: 0,
        duplicatesSkipped: 0,
        retries: 0,
        percent: 0,
        updatedAt: now,
      },
      errors: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  async runJob(job: CrawlJob): Promise<CrawlJob> {
    const { events, jobStore, config, provider } = this.deps;
    const sourceId = job.siteKey;
    const providerName = provider.name;

    await jobStore.save(job);
    await events.publish({
      type: 'CrawlStarted',
      eventId: newId('evt'),
      occurredAt: new Date().toISOString(),
      jobId: job.id,
      sourceId,
      provider: providerName,
      seedUrls: job.config.seedUrls,
    });

    await jobStore.setStatus(job.id, 'discovering');

    let urls: string[] = [];

    if (providerName === 'estate-scrape-legacy') {
      const seed = job.config.seedUrls[0];
      const crawlResult = await provider.crawl(seed, {
        limit: job.config.maxPages,
        metadata: job.config.metadata,
      } as Parameters<CrawlProviderContract['crawl']>[1]);
      if (crawlResult.ok) {
        for (const page of crawlResult.value.pages) {
          const meta = page.metadata as Record<string, unknown> | undefined;
          if (meta) {
            const extraction = {
              sourceUrl: String(meta.detailUrl ?? seed),
              externalId: String(meta.externalId ?? meta.fileCode ?? ''),
              raw: meta,
              extractedAt: new Date().toISOString(),
              extractor: 'estate-scrape-legacy',
            };
            this.layered.appendExtracted(extraction);
            const normalized = this.normalizer.normalize(extraction, {
              siteKey: sourceId,
              jobId: job.id,
            });
            if (normalized.ok) {
              const validated = this.validator.validate(normalized.value);
              if (validated.ok) {
                const ai = new EnrichmentPipeline(
                  { enabled: config.pipeline.aiEnrichment, tasks: [] },
                  new PassthroughAiEnricher(config.pipeline.aiEnrichment)
                );
                const enriched = await ai.enrich(validated.value);
                if (enriched.ok) {
                  const stored = {
                    ...enriched.value,
                    dedupeKey: enriched.value.id,
                    storedAt: new Date().toISOString(),
                  };
                  this.layered.appendProperty(stored);
                  await events.publish({
                    type: 'EntityCreated',
                    eventId: newId('evt'),
                    occurredAt: new Date().toISOString(),
                    jobId: job.id,
                    sourceId,
                    propertyId: stored.id,
                    externalId: stored.externalId,
                  });
                }
              }
            }
          }
        }
        await jobStore.setStatus(job.id, 'completed');
        await jobStore.updateProgress(job.id, {
          listingsStored: this.layered.propertiesForJob(job.id).length,
          percent: 100,
        });
        await events.publish({
          type: 'CrawlCompleted',
          eventId: newId('evt'),
          occurredAt: new Date().toISOString(),
          jobId: job.id,
          sourceId,
          listingsStored: this.layered.propertiesForJob(job.id).length,
          duplicatesSkipped: 0,
          pagesCrawled: crawlResult.value.pages.length,
        });
        this.prom.listingsStored(this.layered.propertiesForJob(job.id).length, sourceId);
        const final = await jobStore.load(job.id);
        return final ?? job;
      }
    }

    const discoveryOpts = buildDiscoveryOptions({
      seedUrls: job.config.seedUrls,
      maxDepth: job.config.maxDepth,
      maxUrls: job.config.maxPages,
      allowedDomains:
        job.config.allowedDomains.length > 0
          ? job.config.allowedDomains
          : job.config.seedUrls.map((u) => new URL(u).hostname.replace(/^www\./, '')),
      includePatterns: job.config.includePatterns,
      excludePatterns: job.config.excludePatterns,
      incremental: job.config.incremental,
    });

    for await (const discovered of this.discovery.discover(job.config.seedUrls, discoveryOpts)) {
      urls.push(discovered.url);
      await events.publish({
        type: 'PageDiscovered',
        eventId: newId('evt'),
        occurredAt: new Date().toISOString(),
        jobId: job.id,
        sourceId,
        url: discovered.url,
        depth: discovered.depth,
        canonicalUrl: discovered.canonicalUrl,
      });
      if (urls.length >= job.config.maxPages) break;
    }

    await jobStore.updateProgress(job.id, { pagesDiscovered: urls.length, percent: 5 });
    await jobStore.setStatus(job.id, 'processing');

    const ai = new EnrichmentPipeline(
      { enabled: config.pipeline.aiEnrichment, tasks: [] },
      new PassthroughAiEnricher(config.pipeline.aiEnrichment)
    );

    let listingsStored = 0;
    let duplicatesSkipped = 0;
    let pagesCrawled = 0;

    for (const url of urls) {
      const current = await jobStore.load(job.id);
      if (current?.status === 'paused' || current?.status === 'cancelled') break;

      const fetchStart = Date.now();
      const result = await this.pipeline.processPage(
        {
          job,
          provider: provider as unknown as CrawlerProvider,
          storage: this.legacyStorage,
          normalizer: this.normalizer,
          validator: this.validator,
          dedupe: job.config.deduplication ? this.dedupe : undefined,
          ai,
          metrics: this.legacyMetrics,
          retainRawHtml: config.pipeline.retainRawHtml,
        },
        { url, depth: 0 }
      );

      this.prom.providerLatency(providerName, 'scrape', Date.now() - fetchStart);
      listingsStored += result.stored;
      duplicatesSkipped += result.skipped;
      pagesCrawled += 1;

      const pct = Math.min(99, Math.round((pagesCrawled / Math.max(urls.length, 1)) * 100));
      await jobStore.updateProgress(job.id, {
        pagesCrawled,
        listingsStored,
        duplicatesSkipped,
        percent: pct,
        currentUrl: url,
      });
    }

    await jobStore.setStatus(job.id, 'completed');
    await jobStore.updateProgress(job.id, { percent: 100 });

    await events.publish({
      type: 'CrawlCompleted',
      eventId: newId('evt'),
      occurredAt: new Date().toISOString(),
      jobId: job.id,
      sourceId,
      listingsStored,
      duplicatesSkipped,
      pagesCrawled,
    });

    this.prom.listingsStored(listingsStored, sourceId);
    const final = await jobStore.load(job.id);
    return final ?? job;
  }

  getLayeredStorage(): LayeredCrawlStorage {
    return this.layered;
  }

  exportScrapedRows(jobId: string) {
    const props = this.layered.propertiesForJob(jobId);
    if (props.length) return storedPropertiesToScrapedRows(props);
    return storedPropertiesToScrapedRows(
      this.legacyStorage.propertyRows.filter((p) => p.jobId === jobId)
    );
  }

  prometheusText(): string {
    return this.prom.exportText();
  }
}
