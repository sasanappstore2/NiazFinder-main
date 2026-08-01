import type { CrawlError } from './errors';

export type CrawlJobStatus =
  | 'pending'
  | 'queued'
  | 'discovering'
  | 'crawling'
  | 'extracting'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type CrawlJobPriority = 'low' | 'normal' | 'high' | 'critical';

export type CrawlJobConfig = {
  seedUrls: string[];
  provider: string;
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  rateLimitPerMinute: number;
  includePatterns: string[];
  excludePatterns: string[];
  allowedDomains: string[];
  respectRobotsTxt: boolean;
  incremental: boolean;
  aiEnrichment: boolean;
  deduplication: boolean;
  parserId?: string;
  extractSchema?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type CrawlJobProgress = {
  pagesDiscovered: number;
  pagesCrawled: number;
  pagesFailed: number;
  listingsExtracted: number;
  listingsStored: number;
  duplicatesSkipped: number;
  retries: number;
  percent: number;
  currentUrl?: string;
  startedAt?: string;
  updatedAt: string;
};

export type CrawlJob = {
  id: string;
  siteKey: string;
  status: CrawlJobStatus;
  priority: CrawlJobPriority;
  config: CrawlJobConfig;
  progress: CrawlJobProgress;
  errors: CrawlError[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type CrawlJobSnapshot = Pick<
  CrawlJob,
  'id' | 'siteKey' | 'status' | 'priority' | 'progress' | 'createdAt' | 'updatedAt' | 'completedAt'
>;
