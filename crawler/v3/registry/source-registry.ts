import { loadSourcesFromFile } from '../config/yaml-loader';
import type { CrawlSource, CrawlSourceScheduleState } from '../domain/crawl-source';
import { crawlSourceSchema } from '../domain/crawl-source';
import type { PlatformConfigV3 } from '../config/schema';

export type SourceRegistryOptions = {
  sourcesPath?: string;
  inlineSources?: CrawlSource[];
};

/** Declarative source registry — no source-specific logic outside config. */
export class SourceRegistry {
  private sources = new Map<string, CrawlSource>();
  private schedule = new Map<string, CrawlSourceScheduleState>();

  constructor(private readonly config: PlatformConfigV3, opts?: SourceRegistryOptions) {
    this.load(opts);
  }

  private load(opts?: SourceRegistryOptions): void {
    const inline = opts?.inlineSources ?? [];
    for (const raw of inline) {
      const parsed = crawlSourceSchema.parse(raw);
      this.sources.set(parsed.id, parsed);
    }

    const path =
      opts?.sourcesPath ??
      this.config.sourcesPath ??
      process.env.CRAWLER_SOURCES_PATH;
    if (path) {
      for (const parsed of loadSourcesFromFile(path)) {
        this.sources.set(parsed.id, parsed);
      }
    }
  }

  register(source: CrawlSource): void {
    this.sources.set(source.id, crawlSourceSchema.parse(source));
  }

  get(id: string): CrawlSource | null {
    return this.sources.get(id) ?? null;
  }

  list(enabledOnly = false): CrawlSource[] {
    const all = [...this.sources.values()];
    return enabledOnly ? all.filter((s) => s.enabled) : all;
  }

  getSchedule(sourceId: string): CrawlSourceScheduleState {
    return (
      this.schedule.get(sourceId) ?? {
        sourceId,
        lastRunAt: null,
        lastSuccessAt: null,
        nextRunAt: null,
        failureCount: 0,
        lastError: null,
      }
    );
  }

  markRun(sourceId: string, ok: boolean, error?: string): void {
    const source = this.sources.get(sourceId);
    const now = new Date().toISOString();
    const prev = this.getSchedule(sourceId);
    const jitterMin = source?.schedulingPolicy.jitterMinutes ?? 0;
    const jitterMs = jitterMin > 0 ? Math.floor(Math.random() * jitterMin * 60_000) : 0;
    const freqMs = (source?.crawlFrequencyMinutes ?? 60) * 60_000;

    this.schedule.set(sourceId, {
      sourceId,
      lastRunAt: now,
      lastSuccessAt: ok ? now : prev.lastSuccessAt,
      nextRunAt: new Date(Date.now() + freqMs + jitterMs).toISOString(),
      failureCount: ok ? 0 : prev.failureCount + 1,
      lastError: ok ? null : (error ?? 'unknown'),
    });
  }

  dueSources(now = Date.now()): CrawlSource[] {
    return this.list(true).filter((source) => {
      const state = this.getSchedule(source.id);
      if (!state.nextRunAt && !state.lastRunAt) return true;
      if (!state.nextRunAt) return true;
      return Date.parse(state.nextRunAt) <= now;
    });
  }
}
