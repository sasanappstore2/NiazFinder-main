import type { CrawlJob, CrawlJobConfig } from '../types/crawl-job';
import type { CrawlerConfig } from '../config/schema';
import { getCrawlerConfig, loadCrawlerConfig } from '../config/loader';
import { bootstrapProviders, createProvider } from '../providers/registry';
import { CrawlEngineV2 } from '../core/crawl-engine';
import { CrawlQueueService, MemoryJobStore } from '../queue/crawl-queue';
import { InMemoryCrawlStorage } from '../storage/memory-store';
import { InMemoryMetricsCollector } from '../monitoring/metrics-collector';
import type { ProviderHealth } from '../interfaces/crawler-provider';
import { crawlJobConfigSchema } from '../config/schema';

export type StartCrawlInput = {
  siteKey: string;
  config: Partial<CrawlJobConfig> & { seedUrls: string[] };
  priority?: CrawlJob['priority'];
};

export type CrawlServiceStatus = {
  job: CrawlJob | null;
  metrics: ReturnType<InMemoryMetricsCollector['snapshot']>;
};

/** Public service API — startCrawl / pause / resume / cancel / status / history / providerHealth */
export class CrawlService {
  private config: CrawlerConfig;
  private jobStore = new MemoryJobStore();
  private queue: CrawlQueueService;
  private storage = new InMemoryCrawlStorage();
  private metrics = new InMemoryMetricsCollector();
  private engine: CrawlEngineV2;
  private running = new Map<string, Promise<CrawlJob>>();

  constructor(config?: CrawlerConfig) {
    this.config = config ?? getCrawlerConfig();
    bootstrapProviders(this.config);
    this.queue = new CrawlQueueService(this.jobStore, this.config.queue);
    const provider = createProvider(this.config.defaultProvider, this.config);
    this.engine = new CrawlEngineV2({
      config: this.config,
      provider,
      queue: this.queue,
      jobStore: this.jobStore,
      storage: this.storage,
      metrics: this.metrics,
    });
  }

  static create(opts?: { configPath?: string }): CrawlService {
    const config = opts?.configPath ? loadCrawlerConfig({ configPath: opts.configPath }) : getCrawlerConfig();
    return new CrawlService(config);
  }

  async startCrawl(input: StartCrawlInput): Promise<CrawlJob> {
    const parsed = crawlJobConfigSchema.parse(input.config);
    const job = this.engine.createJob(input.siteKey, {
      ...parsed,
      provider: parsed.provider ?? this.config.defaultProvider,
      concurrency: parsed.concurrency ?? this.config.queue.concurrency,
      rateLimitPerMinute: parsed.rateLimitPerMinute ?? this.config.queue.rateLimitPerMinute,
      respectRobotsTxt: parsed.respectRobotsTxt ?? this.config.discovery.respectRobotsTxt,
      aiEnrichment: parsed.aiEnrichment ?? this.config.pipeline.aiEnrichment,
      deduplication: parsed.deduplication ?? this.config.pipeline.deduplication,
    }, input.priority);

    await this.queue.enqueue(job);
    const run = this.engine.runJob(job);
    this.running.set(job.id, run);
    run.finally(() => this.running.delete(job.id));
    return job;
  }

  async pause(jobId: string): Promise<boolean> {
    return this.queue.pause(jobId);
  }

  async resume(jobId: string): Promise<boolean> {
    return this.queue.resume(jobId);
  }

  async cancel(jobId: string): Promise<boolean> {
    return this.queue.cancel(jobId);
  }

  async status(jobId: string): Promise<CrawlServiceStatus> {
    const job = await this.queue.get(jobId);
    return {
      job,
      metrics: job ? this.metrics.snapshot(jobId) : this.metrics.snapshot('unknown'),
    };
  }

  async history(): Promise<CrawlJob[]> {
    const snapshots = await this.queue.list();
    const jobs: CrawlJob[] = [];
    for (const s of snapshots) {
      const full = await this.queue.get(s.id);
      if (full) jobs.push(full);
    }
    return jobs;
  }

  async providerHealth(providerName?: string): Promise<ProviderHealth> {
    const name = providerName ?? this.config.defaultProvider;
    bootstrapProviders(this.config);
    const provider = createProvider(name, this.config);
    return provider.health();
  }

  async reindex(jobId: string): Promise<{ reindexed: number }> {
    const props = this.storage.propertyRows.filter((p) => p.jobId === jobId);
    return { reindexed: props.length };
  }

  getStorage(): InMemoryCrawlStorage {
    return this.storage;
  }

  async waitFor(jobId: string): Promise<CrawlJob> {
    const pending = this.running.get(jobId);
    if (pending) return pending;
    const job = await this.queue.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    return job;
  }
}

let singleton: CrawlService | null = null;

export function getCrawlService(): CrawlService {
  if (!singleton) singleton = CrawlService.create();
  return singleton;
}

export function resetCrawlService(): void {
  singleton = null;
}
