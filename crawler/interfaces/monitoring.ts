export type CrawlMetrics = {
  jobId: string;
  pagesCrawled: number;
  pagesFailed: number;
  successRate: number;
  extractionCount: number;
  validationRejected: number;
  duplicatesSkipped: number;
  retries: number;
  avgCrawlDurationMs: number;
  queueLength: number;
  duplicateRate: number;
  providerLatencyMs: number;
  estimatedCostUsd?: number;
  updatedAt: string;
};

export interface MetricsCollector {
  record(event: string, value: number, labels?: Record<string, string>): void;
  snapshot(jobId: string): CrawlMetrics;
  globalSnapshot(): Omit<CrawlMetrics, 'jobId'> & { activeJobs: number };
}
