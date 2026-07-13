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

export type ApiProviderEndpoint = {
  listUrl: string;
  method?: 'GET' | 'POST';
  pageParam?: string;
  contentType?: string;
  referer?: string;
};

export type ApiProviderOptions = {
  timeoutMs?: number;
  endpoints?: Record<string, ApiProviderEndpoint>;
};

/**
 * Generic HTTP API provider — POST/GET JSON or HTML fragments (e.g. maskanyaban _SelectAll).
 * Portal-specific URL building lives in source metadata, not business services.
 */
export class ApiProvider implements CrawlProviderContract {
  readonly name = 'api';
  readonly capabilities = mergeCapabilities(
    {
      authentication: false,
      javascript: false,
      streaming: false,
      screenshots: false,
      structuredExtraction: false,
      pagination: true,
      incremental: true,
      rateLimiting: true,
      sitemapDiscovery: false,
      linkDiscovery: false,
      markdown: false,
      rawHtml: true,
    },
    {}
  );

  constructor(private readonly opts: ApiProviderOptions = {}) {}

  private headers(endpoint: ApiProviderEndpoint, referer?: string): Record<string, string> {
    const h: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/json,*/*',
      'Accept-Language': 'fa-IR,fa;q=0.9',
    };
    if (referer) h.Referer = referer;
    if (endpoint.method === 'POST') {
      h['X-Requested-With'] = 'XMLHttpRequest';
      h['Content-Type'] = endpoint.contentType ?? 'application/json';
    }
    return h;
  }

  async fetch(url: string, options?: ScrapeOptions): Promise<Result<ScrapeResult>> {
    return this.scrape(url, options);
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<Result<ScrapeResult>> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? this.opts.timeoutMs ?? 30_000);
      const method = options?.metadata?.method === 'POST' ? 'POST' : 'GET';
      const res = await fetch(url, {
        method,
        headers: this.headers({ listUrl: url, method }, String(options?.metadata?.referer ?? '')),
        body: method === 'POST' ? '' : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      return ok({
        url,
        html: text,
        statusCode: res.status,
        latencyMs: Date.now() - start,
      });
    } catch (cause) {
      return err(crawlError('network', `API fetch failed: ${String(cause)}`, { provider: this.name, url, cause }));
    }
  }

  async discover(url: string, options?: DiscoverOptions): Promise<Result<DiscoverResult>> {
    return err(crawlError('provider', 'API provider discover requires configured list endpoint in source metadata', { provider: this.name, url }));
  }

  async crawl(_seedUrl: string, _options?: CrawlOptions): Promise<Result<CrawlResult>> {
    return err(crawlError('provider', 'Use pipeline pagination with API provider', { provider: this.name }));
  }

  async extract(_urls: string[], _options?: ExtractOptions): Promise<Result<ExtractResult[]>> {
    return err(crawlError('provider', 'API provider does not extract — use DOM/LLM pipeline stage', { provider: this.name }));
  }

  async health(): Promise<ProviderHealth> {
    return { provider: this.name, healthy: true, checkedAt: new Date().toISOString() };
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
      contentHash: sha256(html),
    };
  }

  supportsAuthentication() {
    return false;
  }
  supportsJavaScript() {
    return false;
  }
  supportsStreaming() {
    return false;
  }
  supportsScreenshots() {
    return false;
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
