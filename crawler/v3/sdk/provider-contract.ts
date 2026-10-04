import type { Result } from '../../types/errors';
import type { RawPageRecord } from '../domain/property';
import type { ProviderCapabilities } from './capabilities';
import type {
  CrawlOptions,
  CrawlResult,
  ExtractOptions,
  ExtractResult,
  MapOptions,
  MapResult,
  ProviderHealth,
  ScrapeOptions,
  ScrapeResult,
  SearchOptions,
  SearchResult,
} from '../../interfaces/crawler-provider';

export type DiscoverOptions = MapOptions & {
  seedUrls?: string[];
  maxDepth?: number;
  incremental?: boolean;
};

export type DiscoverResult = MapResult & {
  canonicalUrls?: string[];
};

export type FetchOptions = ScrapeOptions & {
  followRedirects?: boolean;
};

/** Provider SDK contract — transport only, zero business logic. */
export interface CrawlProviderContract {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  discover(url: string, options?: DiscoverOptions): Promise<Result<DiscoverResult>>;
  crawl(seedUrl: string, options?: CrawlOptions): Promise<Result<CrawlResult>>;
  scrape(url: string, options?: ScrapeOptions): Promise<Result<ScrapeResult>>;
  extract(urls: string[], options?: ExtractOptions): Promise<Result<ExtractResult[]>>;
  fetch(url: string, options?: FetchOptions): Promise<Result<ScrapeResult>>;
  search?(query: string, options?: SearchOptions): Promise<Result<SearchResult>>;

  health(): Promise<ProviderHealth>;
  toRawPage(jobId: string, scrape: ScrapeResult): RawPageRecord;

  supportsAuthentication(): boolean;
  supportsJavaScript(): boolean;
  supportsStreaming(): boolean;
  supportsScreenshots(): boolean;
  supportsStructuredExtraction(): boolean;
  supportsPagination(): boolean;
  supportsIncremental(): boolean;
  supportsRateLimiting(): boolean;
}
