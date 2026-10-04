import type { CrawlSource } from '../domain/crawl-source';
import type { PlatformConfigV3 } from '../config/schema';
import type { SourceRegistry } from '../registry/source-registry';
import type { CrawlJobConfigV3 } from '../config/schema';
import { crawlJobConfigSchemaV3 } from '../config/schema';
import { selectProviderForSource } from '../providers/registry';

export type ScheduledCrawl = {
  source: CrawlSource;
  jobConfig: CrawlJobConfigV3;
  provider: string;
  priority: CrawlSource['priority'];
};

/** Decides which sources are due — no fetching, no provider calls. */
export class CrawlScheduler {
  constructor(
    private readonly config: PlatformConfigV3,
    private readonly registry: SourceRegistry
  ) {}

  tick(now = Date.now(), limit?: number): ScheduledCrawl[] {
    if (!this.config.scheduler.enabled) return [];
    const max = limit ?? this.config.scheduler.maxDuePerTick;
    const due = this.registry.dueSources(now).slice(0, max);

    return due.map((source) => {
      const provider = selectProviderForSource(this.config, source);
      const jobConfig = crawlJobConfigSchemaV3.parse({
        sourceId: source.id,
        seedUrls: source.seedUrls,
        provider,
        maxPages: source.maxPages,
        maxDepth: source.maxDepth,
        allowedDomains: source.allowedDomains,
        includePatterns: source.includePatterns,
        excludePatterns: source.excludePatterns,
        incremental: true,
        extractionStrategy: source.extractionStrategy,
        aiEnrichment: this.config.pipeline.aiEnrichment,
        deduplication: this.config.pipeline.deduplication,
        metadata: {
          ...source.metadata,
          sourceName: source.name,
          normalizationPipeline: source.normalizationPipeline,
          validationRules: source.validationRules,
          dedupeRules: source.dedupeRules,
          providerConfig: source.providerConfig,
        },
      });

      return {
        source,
        jobConfig,
        provider,
        priority: source.priority,
      };
    });
  }
}
