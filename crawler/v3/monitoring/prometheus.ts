import type { PlatformConfigV3 } from '../config/schema';

export type MetricSample = {
  name: string;
  value: number;
  labels?: Record<string, string>;
  at: string;
};

export class PrometheusMetricsExporter {
  private samples: MetricSample[] = [];

  constructor(private readonly config: PlatformConfigV3) {}

  record(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.monitoring.prometheusEnabled) return;
    const full = `${this.config.monitoring.metricsPrefix}_${name}`;
    this.samples.push({ name: full, value, labels, at: new Date().toISOString() });
  }

  providerLatency(provider: string, operation: string, ms: number): void {
    this.record('provider_latency_ms', ms, { provider, operation });
  }

  queueSize(size: number): void {
    this.record('queue_size', size);
  }

  duplicateRate(rate: number): void {
    this.record('duplicate_rate', rate);
  }

  listingsStored(count: number, sourceId: string): void {
    this.record('listings_stored_total', count, { source_id: sourceId });
  }

  exportText(): string {
    const lines: string[] = [];
    const latest = new Map<string, MetricSample>();
    for (const s of this.samples) {
      latest.set(`${s.name}${JSON.stringify(s.labels ?? {})}`, s);
    }
    for (const s of latest.values()) {
      const labelStr = s.labels
        ? `{${Object.entries(s.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')}}`
        : '';
      lines.push(`${s.name}${labelStr} ${s.value}`);
    }
    return lines.join('\n') + (lines.length ? '\n' : '');
  }

  snapshot(): MetricSample[] {
    return [...this.samples];
  }
}
