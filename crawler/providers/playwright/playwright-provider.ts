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

function estateScrapeBase(): string {
  return (process.env.ESTATE_SCRAPE_URL ?? 'http://127.0.0.1:8200').replace(/\/$/, '');
}

/**
 * Bridge provider — delegates to legacy estate-scrape Python service.
 * Business logic stays in filing-scrapers; this is transport only.
 */
export class PlaywrightProvider implements CrawlerProvider {
  readonly name = 'playwright';

  constructor(private readonly opts: { timeoutMs?: number; headless?: boolean } = {}) {}

  async scrape(url: string, options?: ScrapeOptions): Promise<Result<ScrapeResult>> {
    const start = Date.now();
    try {
      const base = estateScrapeBase();
      const secret = process.env.ESTATE_SCRAPE_SECRET?.trim();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (secret) headers['x-estate-scrape-secret'] = secret;

      const res = await fetch(`${base}/v1/scrape-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url, use_scrapegraph: false }),
        signal: AbortSignal.timeout(options?.timeoutMs ?? this.opts.timeoutMs ?? 120_000),
      });
      if (!res.ok) {
        return err(
          crawlError('provider', `estate-scrape scrape failed: ${res.status}`, {
            provider: this.name,
            url,
            retryable: res.status >= 500,
          })
        );
      }
      const data = (await res.json()) as { text?: string; html?: string };
      return ok({
        url,
        markdown: data.text,
        html: data.html,
        latencyMs: Date.now() - start,
      });
    } catch (cause) {
      return err(
        crawlError('network', `Playwright bridge failed: ${String(cause)}`, {
          provider: this.name,
          url,
          cause,
          retryable: true,
        })
      );
    }
  }

  async crawl(seedUrl: string, options?: CrawlOptions): Promise<Result<CrawlResult>> {
    const page = await this.scrape(seedUrl, options?.scrapeOptions);
    if (!page.ok) return page as Result<CrawlResult>;
    return ok({ pages: [page.value], completed: true, latencyMs: page.value.latencyMs });
  }

  async map(): Promise<Result<MapResult>> {
    return err(crawlError('provider', 'Use Firecrawl map or discovery engine', { provider: this.name }));
  }

  async extract(): Promise<Result<ExtractResult[]>> {
    return err(crawlError('provider', 'Use pipeline extract stage', { provider: this.name }));
  }

  async search(): Promise<Result<SearchResult>> {
    return err(crawlError('provider', 'Use Firecrawl search', { provider: this.name }));
  }

  async health(): Promise<ProviderHealth> {
    try {
      const base = estateScrapeBase();
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
      return {
        provider: this.name,
        healthy: res.ok,
        checkedAt: new Date().toISOString(),
      };
    } catch (cause) {
      return {
        provider: this.name,
        healthy: false,
        message: String(cause),
        checkedAt: new Date().toISOString(),
      };
    }
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
