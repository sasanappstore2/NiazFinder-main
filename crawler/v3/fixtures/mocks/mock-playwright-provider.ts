import type { CrawlProviderContract } from '../../sdk/provider-contract';
import { mergeCapabilities } from '../../sdk/capabilities';
import type { ProviderHealth, ScrapeResult } from '../../../interfaces/crawler-provider';
import { ok } from '../../../types/errors';

/** Mock Playwright provider for contract tests — no browser required. */
export class MockPlaywrightProvider implements CrawlProviderContract {
  readonly name = 'playwright-mock';
  readonly capabilities = mergeCapabilities(
    {
      authentication: true,
      javascript: true,
      streaming: false,
      screenshots: true,
      structuredExtraction: false,
      pagination: true,
      incremental: true,
      rateLimiting: true,
      sitemapDiscovery: false,
      linkDiscovery: true,
      markdown: false,
      rawHtml: true,
    },
    {}
  );

  async discover() {
    return ok({ urls: ['https://mock.local/listing/1'], latencyMs: 1 });
  }
  async crawl() {
    return ok({
      pages: [{ url: 'https://mock.local/listing/1', html: '<div>mock</div>', latencyMs: 1 }],
      completed: true,
      latencyMs: 1,
    });
  }
  async scrape(url: string) {
    return ok({ url, html: '<html><body>mock listing</body></html>', latencyMs: 2 });
  }
  async extract() {
    return ok([]);
  }
  async fetch(url: string) {
    return this.scrape(url);
  }
  async health(): Promise<ProviderHealth> {
    return { provider: this.name, healthy: true, checkedAt: new Date().toISOString() };
  }
  toRawPage(jobId: string, scrape: ScrapeResult) {
    return {
      id: 'raw_mock',
      jobId,
      url: scrape.url,
      fetchedAt: new Date().toISOString(),
      provider: this.name,
      html: scrape.html,
      contentHash: 'mock',
    };
  }

  supportsAuthentication() {
    return true;
  }
  supportsJavaScript() {
    return true;
  }
  supportsStreaming() {
    return false;
  }
  supportsScreenshots() {
    return true;
  }
  supportsStructuredExtraction() {
    return false;
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
