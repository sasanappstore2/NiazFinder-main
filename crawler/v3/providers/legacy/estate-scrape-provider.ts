import type { CrawlProviderContract } from '../../sdk/provider-contract';
import type { PlatformConfigV3 } from '../../config/schema';
import { mergeCapabilities } from '../../sdk/capabilities';
import { crawlError, err, ok, type Result } from '../../../types/errors';
import { newId, sha256 } from '../../../core/utils';
import type { RawPageRecord } from '../../domain/property';
import type {
  CrawlOptions,
  CrawlResult,
  ExtractOptions,
  ExtractResult,
  ProviderHealth,
  ScrapeOptions,
  ScrapeResult,
} from '../../../interfaces/crawler-provider';
import type { DiscoverOptions, DiscoverResult } from '../../sdk/provider-contract';

export type EstateScrapeLegacyOptions = {
  baseUrl?: string;
  secret?: string;
};

type LegacyScrapePayload = {
  siteKey: string;
  listingsUrl: string;
  loginUrl?: string;
  username?: string;
  password?: string;
  siteConfig?: Record<string, unknown>;
  maxItems?: number;
  knownExternalIds?: string[];
};

type LegacyScrapeResponse = {
  ok: boolean;
  listings: Array<Record<string, unknown>>;
  pageUrl?: string;
  extractMethod?: string;
  error?: string;
};

/**
 * Bridge to mini-services/estate-scrape — keeps Python DOM/Playwright/ScrapeGraph
 * behind the provider contract until fully ported.
 */
export class EstateScrapeLegacyProvider implements CrawlProviderContract {
  readonly name = 'estate-scrape-legacy';
  readonly capabilities = mergeCapabilities(
    {
      authentication: true,
      javascript: true,
      streaming: false,
      screenshots: false,
      structuredExtraction: true,
      pagination: true,
      incremental: true,
      rateLimiting: true,
      sitemapDiscovery: true,
      linkDiscovery: true,
      markdown: false,
      rawHtml: true,
    },
    {}
  );

  constructor(private readonly opts: EstateScrapeLegacyOptions = {}) {}

  private baseUrl(): string {
    return (this.opts.baseUrl ?? 'http://127.0.0.1:8200').replace(/\/$/, '');
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.opts.secret) h['X-Estate-Scrape-Secret'] = this.opts.secret;
    return h;
  }

  async crawl(seedUrl: string, options?: CrawlOptions & { metadata?: Record<string, unknown> }): Promise<Result<CrawlResult>> {
    const meta = (options as { metadata?: Record<string, unknown> } | undefined)?.metadata ?? {};
    const payload: LegacyScrapePayload = {
      siteKey: String(meta.siteKey ?? 'legacy'),
      listingsUrl: seedUrl,
      loginUrl: String(meta.loginUrl ?? ''),
      username: String(meta.username ?? ''),
      password: String(meta.password ?? ''),
      siteConfig: (meta.siteConfig as Record<string, unknown>) ?? {},
      maxItems: options?.limit ?? 100,
      knownExternalIds: Array.isArray(meta.knownExternalIds) ? (meta.knownExternalIds as string[]) : [],
    };

    try {
      const res = await fetch(`${this.baseUrl()}/v1/filing-feed/scrape`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        return err(crawlError('provider', `estate-scrape HTTP ${res.status}: ${text.slice(0, 200)}`, { provider: this.name }));
      }
      const data = (await res.json()) as LegacyScrapeResponse;
      if (!data.ok && !data.listings?.length) {
        return err(crawlError('provider', data.error ?? 'estate-scrape returned no listings', { provider: this.name }));
      }

      const pages: CrawlResult['pages'] = (data.listings ?? []).map((row) => ({
        url: String(row.detailUrl ?? seedUrl),
        html: JSON.stringify(row),
        metadata: row,
        latencyMs: 0,
      }));

      return ok({
        pages,
        completed: true,
        latencyMs: 0,
      });
    } catch (cause) {
      return err(crawlError('network', `estate-scrape unreachable: ${String(cause)}`, { provider: this.name, cause }));
    }
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<Result<ScrapeResult>> {
    const crawlResult = await this.crawl(url, { limit: 1, scrapeOptions: options });
    if (!crawlResult.ok) return crawlResult;
    const page = crawlResult.value.pages[0];
    return ok({
      url,
      html: page?.html,
      metadata: page?.metadata,
      latencyMs: crawlResult.value.latencyMs,
    });
  }

  async fetch(url: string, options?: ScrapeOptions) {
    return this.scrape(url, options);
  }

  async discover(url: string, options?: DiscoverOptions): Promise<Result<DiscoverResult>> {
    try {
      const res = await fetch(`${this.baseUrl()}/v1/filing-feed/site-map`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ entryUrl: url, userCity: options?.search ?? '' }),
      });
      if (!res.ok) {
        return err(crawlError('provider', `site-map failed: ${res.status}`, { provider: this.name }));
      }
      const data = (await res.json()) as { urls?: string[] };
      return ok({ urls: data.urls ?? [], latencyMs: 0 });
    } catch (cause) {
      return err(crawlError('network', String(cause), { provider: this.name, cause }));
    }
  }

  async extract(_urls: string[], _options?: ExtractOptions): Promise<Result<ExtractResult[]>> {
    return err(crawlError('provider', 'Use crawl() — legacy returns structured listings', { provider: this.name }));
  }

  async health(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl()}/health`, { signal: AbortSignal.timeout(5000) });
      return {
        provider: this.name,
        healthy: res.ok,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        message: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (cause) {
      return {
        provider: this.name,
        healthy: false,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        message: String(cause),
      };
    }
  }

  toRawPage(jobId: string, scrape: ScrapeResult): RawPageRecord {
    const html = scrape.html ?? '';
    return {
      id: newId('raw'),
      jobId,
      url: scrape.url,
      fetchedAt: new Date().toISOString(),
      provider: this.name,
      statusCode: scrape.statusCode,
      html,
      metadata: scrape.metadata,
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
    return false;
  }
  supportsScreenshots() {
    return false;
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
