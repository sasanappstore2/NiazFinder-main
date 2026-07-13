import type { CrawlerProvider } from '../../interfaces/crawler-provider';
import type { RawPageRecord } from '../domain/property';
import type { ProviderCapabilities } from './capabilities';
import type {
  CrawlProviderContract,
  DiscoverOptions,
  DiscoverResult,
  FetchOptions,
} from './provider-contract';
import type { Result } from '../../types/errors';
import { ok } from '../../types/errors';

/**
 * Adapts legacy V2 CrawlerProvider → V3 CrawlProviderContract with capability flags.
 * Business services must depend on CrawlProviderContract, never on CrawlerProvider.
 */
export class BaseProviderAdapter implements CrawlProviderContract {
  constructor(
    private readonly inner: CrawlerProvider,
    readonly capabilities: ProviderCapabilities
  ) {}

  get name(): string {
    return this.inner.name;
  }

  async discover(url: string, options?: DiscoverOptions): Promise<Result<DiscoverResult>> {
    const mapResult = await this.inner.map(url, options);
    if (!mapResult.ok) return mapResult;
    return ok({
      ...mapResult.value,
      canonicalUrls: mapResult.value.urls,
    });
  }

  crawl(seedUrl: string, options?: Parameters<CrawlerProvider['crawl']>[1]) {
    return this.inner.crawl(seedUrl, options);
  }

  scrape(url: string, options?: Parameters<CrawlerProvider['scrape']>[1]) {
    return this.inner.scrape(url, options);
  }

  extract(urls: string[], options?: Parameters<CrawlerProvider['extract']>[1]) {
    return this.inner.extract(urls, options);
  }

  async fetch(url: string, options?: FetchOptions): Promise<Result<import('../../interfaces/crawler-provider').ScrapeResult>> {
    return this.inner.scrape(url, {
      ...options,
      formats: options?.formats ?? ['rawHtml', 'html'],
    });
  }

  search(query: string, options?: Parameters<CrawlerProvider['search']>[1]) {
    return this.inner.search(query, options);
  }

  health() {
    return this.inner.health();
  }

  toRawPage(jobId: string, scrape: Parameters<CrawlerProvider['toRawPage']>[1]): RawPageRecord {
    return this.inner.toRawPage(jobId, scrape);
  }

  supportsAuthentication(): boolean {
    return this.capabilities.authentication;
  }
  supportsJavaScript(): boolean {
    return this.capabilities.javascript;
  }
  supportsStreaming(): boolean {
    return this.capabilities.streaming;
  }
  supportsScreenshots(): boolean {
    return this.capabilities.screenshots;
  }
  supportsStructuredExtraction(): boolean {
    return this.capabilities.structuredExtraction;
  }
  supportsPagination(): boolean {
    return this.capabilities.pagination;
  }
  supportsIncremental(): boolean {
    return this.capabilities.incremental;
  }
  supportsRateLimiting(): boolean {
    return this.capabilities.rateLimiting;
  }
}
