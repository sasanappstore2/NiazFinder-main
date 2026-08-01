import type { CrawlMetrics, MetricsCollector } from '../interfaces/monitoring';

type CounterKey = string;

export class InMemoryMetricsCollector implements MetricsCollector {
  private counters = new Map<CounterKey, number>();
  private latencySum = new Map<string, number>();
  private latencyCount = new Map<string, number>();

  record(event: string, value: number, labels?: Record<string, string>): void {
    const key = labelKey(event, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
    if (event.includes('latency')) {
      const jobId = labels?.jobId ?? 'global';
      this.latencySum.set(jobId, (this.latencySum.get(jobId) ?? 0) + value);
      this.latencyCount.set(jobId, (this.latencyCount.get(jobId) ?? 0) + 1);
    }
  }

  snapshot(jobId: string): CrawlMetrics {
    const pagesCrawled = this.get('pages_crawled', jobId);
    const pagesFailed = this.get('pages_failed', jobId);
    const total = pagesCrawled + pagesFailed;
    const duplicatesSkipped = this.get('duplicates_skipped', jobId);
    const extractionCount = this.get('extraction_count', jobId) || pagesCrawled;

    return {
      jobId,
      pagesCrawled,
      pagesFailed,
      successRate: total ? pagesCrawled / total : 0,
      extractionCount,
      validationRejected: this.get('validation_rejected', jobId),
      duplicatesSkipped,
      retries: this.get('retries', jobId),
      avgCrawlDurationMs: this.avgLatency(jobId),
      queueLength: 0,
      duplicateRate: extractionCount ? duplicatesSkipped / extractionCount : 0,
      providerLatencyMs: this.avgLatency(jobId),
      updatedAt: new Date().toISOString(),
    };
  }

  globalSnapshot(): Omit<CrawlMetrics, 'jobId'> & { activeJobs: number } {
    const snap = this.snapshot('global');
    const { jobId: _j, ...rest } = snap;
    return { ...rest, activeJobs: this.get('active_jobs', 'global') };
  }

  private get(event: string, jobId: string): number {
    return this.counters.get(labelKey(event, { jobId })) ?? 0;
  }

  private avgLatency(jobId: string): number {
    const sum = this.latencySum.get(jobId) ?? 0;
    const count = this.latencyCount.get(jobId) ?? 0;
    return count ? sum / count : 0;
  }
}

function labelKey(event: string, labels?: Record<string, string>): string {
  if (!labels) return event;
  const parts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  return `${event}|${parts.join(',')}`;
}
