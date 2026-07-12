import type { Result } from '../types/errors';
import type { RawPageRecord } from '../types/property';

export type ScrapeFormat = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot';

export type ScrapeOptions = {
  formats?: ScrapeFormat[];
  waitFor?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  metadata?: Record<string, unknown>;
};

export type CrawlOptions = {
  limit?: number;
  maxDepth?: number;
  allowBackwardLinks?: boolean;
  allowExternalLinks?: boolean;
  includePaths?: string[];
  excludePaths?: string[];
  scrapeOptions?: ScrapeOptions;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

export type MapOptions = {
  search?: string;
  limit?: number;
  includeSubdomains?: boolean;
  sitemap?: 'include' | 'skip' | 'only';
};

export type ExtractOptions = {
  prompt?: string;
  schema?: Record<string, unknown>;
  systemPrompt?: string;
  timeoutMs?: number;
};

export type SearchOptions = {
  limit?: number;
  lang?: string;
  country?: string;
  scrapeOptions?: ScrapeOptions;
};

export type ScrapeResult = {
  url: string;
  markdown?: string;
  html?: string;
  links?: string[];
  metadata?: Record<string, unknown>;
  statusCode?: number;
  providerJobId?: string;
  latencyMs: number;
};

export type CrawlPageResult = ScrapeResult & { depth?: number };

export type CrawlResult = {
  pages: CrawlPageResult[];
  completed: boolean;
  providerJobId?: string;
  latencyMs: number;
};

export type MapResult = {
  urls: string[];
  latencyMs: number;
};

export type ExtractResult = {
  url: string;
  data: unknown;
  sources?: Array<{ url: string; excerpt?: string }>;
  latencyMs: number;
};

export type SearchResult = {
  results: Array<{ url: string; title?: string; description?: string; markdown?: string }>;
  latencyMs: number;
};

export type ProviderHealth = {
  provider: string;
  healthy: boolean;
  latencyMs?: number;
  message?: string;
  checkedAt: string;
};

/** Primary abstraction — all providers implement identical surface. */
export interface CrawlerProvider {
  readonly name: string;

  scrape(url: string, options?: ScrapeOptions): Promise<Result<ScrapeResult>>;
  crawl(seedUrl: string, options?: CrawlOptions): Promise<Result<CrawlResult>>;
  map(url: string, options?: MapOptions): Promise<Result<MapResult>>;
  extract(urls: string[], options?: ExtractOptions): Promise<Result<ExtractResult[]>>;
  search(query: string, options?: SearchOptions): Promise<Result<SearchResult>>;

  health(): Promise<ProviderHealth>;
  toRawPage(jobId: string, scrape: ScrapeResult): RawPageRecord;
}
