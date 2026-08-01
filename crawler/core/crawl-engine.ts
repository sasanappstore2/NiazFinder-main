import type { CrawlerConfig } from '../config/schema';
import type { CrawlJob, CrawlJobConfig } from '../types/crawl-job';
import type { CrawlerProvider } from '../interfaces/crawler-provider';
import type { CrawlQueue, JobStore } from '../interfaces/queue';
import type { CrawlStorage } from '../interfaces/storage';
import type { MetricsCollector } from '../interfaces/monitoring';
import { buildDiscoveryOptions, UrlDiscoveryEngine } from './discovery-engine';
import { newId } from './utils';
import { ExtractionPipeline } from '../pipeline/extraction-pipeline';
import { GenericPropertyNormalizer } from '../parser/normalizer';
import { PropertyRecordValidator } from '../parser/validators';
import { MultiSignalDedupeEngine } from '../dedupe/engine';
import { PassthroughAiEnricher } from '../ai/enricher';

export type CrawlEngineDeps = {
  config: CrawlerConfig;
  provider: CrawlerProvider;
  queue: CrawlQueue;
  jobStore: JobStore;
  storage: CrawlStorage;
  metrics: MetricsCollector;
};

export class CrawlEngineV2 {
  private readonly pipeline = new ExtractionPipeline();
  private readonly discovery: UrlDiscoveryEngine;
  private readonly normalizer = new GenericPropertyNormalizer();
  private readonly validator = new PropertyRecordValidator();
  private readonly dedupe = new MultiSignalDedupeEngine();

  constructor(private readonly deps: CrawlEngineDeps) {
    this.discovery = new UrlDiscoveryEngine(deps.provider);
  }

  createJob(siteKey: string, config: CrawlJobConfig, priority: CrawlJob['priority'] = 'normal'): CrawlJob {
    const now = new Date().toISOString();
    return {
      id: newId('job'),
      siteKey,
      status: 'pending',
      priority,
      config,
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
    await this.deps.jobStore.save(job);
    await this.deps.jobStore.setStatus(job.id, 'discovering');

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

    const urls: string[] = [];
    for await (const discovered of this.discovery.discover(job.config.seedUrls, discoveryOpts)) {
      urls.push(discovered.url);
      if (urls.length >= job.config.maxPages) break;
    }

    await this.deps.jobStore.updateProgress(job.id, {
      pagesDiscovered: urls.length,
      percent: 5,
    });
    await this.deps.jobStore.setStatus(job.id, 'processing');

    const ai = new PassthroughAiEnricher(this.deps.config.pipeline.aiEnrichment);
    let listingsStored = 0;
    let duplicatesSkipped = 0;
    let pagesCrawled = 0;
    let pagesFailed = 0;

    for (const url of urls) {
      const current = await this.deps.jobStore.load(job.id);
      if (current?.status === 'paused' || current?.status === 'cancelled') break;

      const result = await this.pipeline.processPage(
        {
          job,
          provider: this.deps.provider,
          storage: this.deps.storage,
          normalizer: this.normalizer,
          validator: this.validator,
          dedupe: job.config.deduplication ? this.dedupe : undefined,
          ai,
          metrics: this.deps.metrics,
          retainRawHtml: this.deps.config.pipeline.retainRawHtml,
        },
        { url, depth: 0 }
      );

      listingsStored += result.stored;
      duplicatesSkipped += result.skipped;
      if (result.stored > 0 || result.skipped >= 0) pagesCrawled += 1;
      else pagesFailed += 1;

      const pct = Math.min(99, Math.round((pagesCrawled / Math.max(urls.length, 1)) * 100));
      await this.deps.jobStore.updateProgress(job.id, {
        pagesCrawled,
        pagesFailed,
        listingsStored,
        duplicatesSkipped,
        percent: pct,
        currentUrl: url,
      });
    }

    await this.deps.jobStore.setStatus(job.id, 'completed');
    await this.deps.jobStore.updateProgress(job.id, { percent: 100 });

    const final = await this.deps.jobStore.load(job.id);
    return final ?? job;
  }
}
