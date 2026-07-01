import type {
  CrawlOptions,
  CrawlResult,
  CrawlerProvider,
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
import type { RawPageRecord } from '../../types/property';
import { crawlError, err, ok, type Result } from '../../types/errors';
import { newId, sha256 } from '../../core/utils';

export type HttpProviderOptions = {
  timeoutMs?: number;
  userAgent?: string;
  proxy?: string;
};

const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export class HttpProvider implements CrawlerProvider {
  readonly name = 'http';

  constructor(private readonly opts: HttpProviderOptions = {}) {}

  private headers(): Record<string, string> {
    return {
      'User-Agent': this.opts.userAgent ?? DEFAULT_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
    };
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<Result<ScrapeResult>> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? this.opts.timeoutMs ?? 30_000);
      const res = await fetch(url, { headers: this.headers(), signal: controller.signal });
      clearTimeout(timer);
      const html = await res.text();
      return ok({
        url,
        html,
        statusCode: res.status,
        latencyMs: Date.now() - start,
      });
    } catch (cause) {
      return err(
        crawlError('network', `HTTP scrape failed: ${String(cause)}`, {
          provider: this.name,
          url,
          cause,
          retryable: true,
        })
      );
    }
  }

  async crawl(seedUrl: string, options?: CrawlOptions): Promise<Result<CrawlResult>> {
    const single = await this.scrape(seedUrl, options?.scrapeOptions);
    if (!single.ok) return single as Result<CrawlResult>;
    return ok({
      pages: [{ ...single.value, depth: 0 }],
      completed: true,
      latencyMs: single.value.latencyMs,
    });
  }

  async map(url: string): Promise<Result<MapResult>> {
    const scraped = await this.scrape(url, { formats: ['html'] });
    if (!scraped.ok) return scraped as Result<MapResult>;
    const hrefs = [...scraped.value.html?.matchAll(/href=["']([^"']+)["']/gi) ?? []].map((m) => m[1]!);
    return ok({ urls: [...new Set(hrefs)], latencyMs: scraped.value.latencyMs });
  }

  async extract(): Promise<Result<ExtractResult[]>> {
    return err(
      crawlError('provider', 'HTTP provider does not support extract — use Firecrawl or parser pipeline', {
        provider: this.name,
        retryable: false,
      })
    );
  }

  async search(): Promise<Result<SearchResult>> {
    return err(
      crawlError('provider', 'HTTP provider does not support search', {
        provider: this.name,
        retryable: false,
      })
    );
  }

  async health(): Promise<ProviderHealth> {
    return { provider: this.name, healthy: true, checkedAt: new Date().toISOString() };
  }

  toRawPage(jobId: string, scrape: ScrapeResult): RawPageRecord {
    const content = scrape.html ?? scrape.markdown ?? '';
    return {
      id: newId('raw'),
      jobId,
      url: scrape.url,
      fetchedAt: new Date().toISOString(),
      provider: this.name,
      statusCode: scrape.statusCode,
      html: scrape.html,
      markdown: scrape.markdown,
      metadata: scrape.metadata,
      contentHash: sha256(content),
    };
  }
}
