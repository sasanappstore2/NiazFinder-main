import type { CrawlProviderContract } from '../../sdk/provider-contract';
import { mergeCapabilities } from '../../sdk/capabilities';
import { crawlError, err, type Result } from '../../../types/errors';
import type {
  CrawlOptions,
  CrawlResult,
  ExtractOptions,
  ExtractResult,
  ProviderHealth,
  ScrapeOptions,
  ScrapeResult,
} from '../../../interfaces/crawler-provider';
import type { RawPageRecord } from '../../domain/property';
import type { DiscoverOptions, DiscoverResult } from '../../sdk/provider-contract';
import { newId, sha256 } from '../../../core/utils';

/**
 * Placeholder for future browser automation providers (e.g. Browserbase, custom CDP).
 * Implements full contract; returns structured "not configured" until wired.
 */
export class FutureBrowserProvider implements CrawlProviderContract {
  readonly name = 'future-browser';
  readonly capabilities = mergeCapabilities(
    {
      authentication: true,
      javascript: true,
      streaming: true,
      screenshots: true,
      structuredExtraction: true,
      pagination: true,
      incremental: true,
      rateLimiting: true,
      sitemapDiscovery: true,
      linkDiscovery: true,
      markdown: true,
      rawHtml: true,
    },
    {}
  );

  private notReady<T>(op: string): Result<T> {
    return err(
      crawlError('provider', `FutureBrowserProvider.${op} not configured — register a browser backend`, {
        provider: this.name,
      })
    );
  }

  discover(_url: string, _options?: DiscoverOptions): Promise<Result<DiscoverResult>> {
    return Promise.resolve(this.notReady<DiscoverResult>('discover'));
  }
  crawl(_seed: string, _options?: CrawlOptions): Promise<Result<CrawlResult>> {
    return Promise.resolve(this.notReady<CrawlResult>('crawl'));
  }
  scrape(_url: string, _options?: ScrapeOptions): Promise<Result<ScrapeResult>> {
    return Promise.resolve(this.notReady<ScrapeResult>('scrape'));
  }
  extract(_urls: string[], _options?: ExtractOptions): Promise<Result<ExtractResult[]>> {
    return Promise.resolve(this.notReady<ExtractResult[]>('extract'));
  }
  fetch(_url: string, _options?: ScrapeOptions): Promise<Result<ScrapeResult>> {
    return Promise.resolve(this.notReady<ScrapeResult>('fetch'));
  }

  async health(): Promise<ProviderHealth> {
    return {
      provider: this.name,
      healthy: false,
      checkedAt: new Date().toISOString(),
      message: 'not configured',
    };
  }

  toRawPage(jobId: string, scrape: ScrapeResult): RawPageRecord {
    const html = scrape.html ?? '';
    return {
      id: newId('raw'),
      jobId,
      url: scrape.url,
      fetchedAt: new Date().toISOString(),
      provider: this.name,
      html,
      contentHash: sha256(html),
    };
  }

  supportsAuthentication() {
    return true;
  }
  supportsJavaScript() {
    return true;
  }
  supportsStreaming() {
    return true;
  }
  supportsScreenshots() {
    return true;
  }
  supportsStructuredExtraction() {
    return true;
  }
  supportsPagination() {
    return true;
  }
  supportsIncremental() {
    return true;
  }
  supportsRateLimiting() {
    return true;
  }
}
