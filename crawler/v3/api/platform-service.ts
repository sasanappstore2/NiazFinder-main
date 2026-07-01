import type { CrawlJob } from '../../types/crawl-job';
import type { CrawlJobConfigV3 } from '../config/schema';
import { crawlJobConfigSchemaV3 } from '../config/schema';
import { getPlatformConfigV3, loadPlatformConfigV3 } from '../config/loader';
import { bootstrapV3Providers, createV3Provider } from '../providers/registry';
import { SourceRegistry } from '../registry/source-registry';
import { CrawlScheduler } from '../scheduler/crawl-scheduler';
import { createCrawlQueueV3 } from '../queue/queue-factory';
import { InMemoryEventBus } from '../events/event-bus';
import { EventAnalyticsStage } from '../analytics/event-collector';
import { InMemorySearchIndexStage } from '../search/index-publisher';
import { CrawlPipelineOrchestrator } from '../pipeline/orchestrator';
import type { ProviderHealth } from '../../interfaces/crawler-provider';
import type { CrawlSource } from '../domain/crawl-source';

export type StartCrawlInputV3 = {
  sourceId?: string;
  config?: Partial<CrawlJobConfigV3> & { seedUrls: string[] };
  priority?: CrawlJob['priority'];
};

/**
 * Public V3 platform API — single entry for schedulers, workers, and admin routes.
 */
export class CrawlerPlatformService {
  private config = getPlatformConfigV3();
  private events = new InMemoryEventBus();
  private analytics = new EventAnalyticsStage();
  private searchIndex = new InMemorySearchIndexStage();
  private registry = new SourceRegistry(this.config);
  private scheduler = new CrawlScheduler(this.config, this.registry);
  private queuePromise = createCrawlQueueV3(this.config);
  private orchestrator: CrawlPipelineOrchestrator | null = null;
  private running = new Map<string, Promise<CrawlJob>>();

  static create(opts?: { configPath?: string }): CrawlerPlatformService {
    if (opts?.configPath) loadPlatformConfigV3({ configPath: opts.configPath });
    const svc = new CrawlerPlatformService();
    svc.wireEventHandlers();
    return svc;
  }

  private wireEventHandlers(): void {
    const types = [
      'CrawlStarted',
      'CrawlCompleted',
      'CrawlFailed',
      'PageDiscovered',
      'PageFetched',
      'ExtractionCompleted',
      'ValidationFailed',
      'EntityCreated',
      'EntityUpdated',
      'DuplicateDetected',
      'ProviderFailed',
    ] as const;
    for (const type of types) {
      this.events.subscribe(type, (e) => {
        void this.analytics.recordEvent(e);
        if ('propertyId' in e) {
          const orch = this.orchestrator;
          if (orch) {
            const props = orch.getLayeredStorage().propertiesForJob(e.jobId);
            const prop = props.find((p) => p.id === e.propertyId);
            if (prop) void this.searchIndex.index(prop);
          }
        }
      });
    }
  }

  private async deps() {
    const { store, queue } = await this.queuePromise;
    bootstrapV3Providers(this.config);
    const provider = createV3Provider(this.config.defaultProvider, this.config);
    const orchestrator =
      this.orchestrator ??
      new CrawlPipelineOrchestrator({
        config: this.config,
        provider,
        queue,
        jobStore: store,
        events: this.events,
      });
    this.orchestrator = orchestrator;
    return { store, queue, orchestrator, provider };
  }

  registerSource(source: CrawlSource): void {
    this.registry.register(source);
  }

  listSources(): CrawlSource[] {
    return this.registry.list();
  }

  dueSources(limit?: number) {
    return this.scheduler.tick(Date.now(), limit);
  }

  async startCrawl(input: StartCrawlInputV3): Promise<CrawlJob> {
    const { orchestrator, queue } = await this.deps();

    let jobConfig: CrawlJobConfigV3;
    let sourceId: string;
    let priority = input.priority ?? 'normal';

    if (input.sourceId) {
      const source = this.registry.get(input.sourceId);
      if (!source) throw new Error(`Unknown source: ${input.sourceId}`);
      const scheduled = this.scheduler.tick().find((s) => s.source.id === input.sourceId);
      if (!scheduled) {
        jobConfig = crawlJobConfigSchemaV3.parse({
          sourceId: source.id,
          seedUrls: source.seedUrls,
          provider: source.provider,
          maxPages: source.maxPages,
          maxDepth: source.maxDepth,
          metadata: source.metadata,
          ...input.config,
        });
      } else {
        jobConfig = scheduled.jobConfig;
        priority = scheduled.priority;
      }
      sourceId = source.id;
    } else if (input.config) {
      jobConfig = crawlJobConfigSchemaV3.parse(input.config);
      sourceId = jobConfig.sourceId;
    } else {
      throw new Error('startCrawl requires sourceId or config');
    }

    const providerName = jobConfig.provider ?? this.config.defaultProvider;
    bootstrapV3Providers(this.config);
    const provider = createV3Provider(providerName, this.config);

    const orch = new CrawlPipelineOrchestrator({
      config: this.config,
      provider,
      queue,
      jobStore: (await this.queuePromise).store,
      events: this.events,
    });

    const job = orch.createJob(sourceId, jobConfig, priority);
    await queue.enqueue(job, { priority });
    const run = orch.runJob(job);
    this.running.set(job.id, run);
    run.finally(() => this.running.delete(job.id));
    return job;
  }

  async pause(jobId: string): Promise<boolean> {
    const { queue } = await this.deps();
    return queue.pause(jobId);
  }

  async resume(jobId: string): Promise<boolean> {
    const { queue } = await this.deps();
    return queue.resume(jobId);
  }

  async cancel(jobId: string): Promise<boolean> {
    const { queue } = await this.deps();
    return queue.cancel(jobId);
  }

  async status(jobId: string): Promise<{ job: CrawlJob | null; events: number }> {
    const { queue } = await this.deps();
    const job = await queue.get(jobId);
    return { job, events: this.events.history(jobId).length };
  }

  async providerHealth(name?: string): Promise<ProviderHealth> {
    bootstrapV3Providers(this.config);
    const provider = createV3Provider(name ?? this.config.defaultProvider, this.config);
    return provider.health();
  }

  async waitFor(jobId: string): Promise<CrawlJob> {
    const pending = this.running.get(jobId);
    if (pending) return pending;
    const { queue } = await this.deps();
    const job = await queue.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    return job;
  }

  getEventBus(): InMemoryEventBus {
    return this.events;
  }

  async exportScrapedRows(jobId: string) {
    const { orchestrator } = await this.deps();
    return orchestrator.exportScrapedRows(jobId);
  }

  async metricsText(): Promise<string> {
    const { orchestrator } = await this.deps();
    return orchestrator.prometheusText();
  }

  getAnalytics(): EventAnalyticsStage {
    return this.analytics;
  }

  getSearchIndex(): InMemorySearchIndexStage {
    return this.searchIndex;
  }
}

let singleton: CrawlerPlatformService | null = null;

export function getCrawlerPlatformService(): CrawlerPlatformService {
  if (!singleton) singleton = CrawlerPlatformService.create();
  return singleton;
}

export function resetCrawlerPlatformService(): void {
  singleton = null;
}
