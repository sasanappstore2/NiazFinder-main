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

/** Minimal Firecrawl client surface — mockable in tests. */
export type FirecrawlClientLike = {
  scrape(url: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  crawl(url: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  map(url: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  extract?(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  search?(query: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
};

export type FirecrawlProviderOptions = {
  apiKey?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  client?: FirecrawlClientLike;
};

function latency(start: number): number {
  return Date.now() - start;
}

function scrapeFromResponse(url: string, data: Record<string, unknown>, ms: number): ScrapeResult {
  const metadata = (data.metadata as Record<string, unknown>) ?? {};
  return {
    url: String(metadata.sourceURL ?? metadata.url ?? url),
    markdown: typeof data.markdown === 'string' ? data.markdown : undefined,
    html: typeof data.html === 'string' ? data.html : typeof data.rawHtml === 'string' ? data.rawHtml : undefined,
    links: Array.isArray(data.links) ? (data.links as string[]) : undefined,
    metadata,
    statusCode: typeof metadata.statusCode === 'number' ? metadata.statusCode : undefined,
    providerJobId: typeof data.id === 'string' ? data.id : undefined,
    latencyMs: ms,
  };
}

export async function createFirecrawlClient(opts: FirecrawlProviderOptions): Promise<FirecrawlClientLike> {
  if (opts.client) return opts.client;
  const apiKey = opts.apiKey ?? process.env.FIRECRAWL_API_KEY ?? '';
  try {
    const mod = await import('firecrawl');
    const Firecrawl = mod.Firecrawl ?? mod.default?.Firecrawl ?? mod.default;
    if (!Firecrawl) throw new Error('Firecrawl export missing');
    return new Firecrawl({ apiKey: apiKey || undefined }) as FirecrawlClientLike;
  } catch (cause) {
    throw crawlError('provider', 'Firecrawl SDK not installed. Run: npm install firecrawl', {
      cause,
      retryable: false,
    });
  }
}

export class FirecrawlProvider implements CrawlerProvider {
  readonly name = 'firecrawl';
  private client: FirecrawlClientLike | null = null;

  constructor(private readonly opts: FirecrawlProviderOptions = {}) {}

  private async getClient(): Promise<FirecrawlClientLike> {
    if (!this.client) this.client = await createFirecrawlClient(this.opts);
    return this.client;
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<Result<ScrapeResult>> {
    const start = Date.now();
    try {
      const client = await this.getClient();
      const formats = options?.formats ?? ['markdown', 'html'];
      const data = await client.scrape(url, {
        formats,
        timeout: options?.timeoutMs ?? this.opts.timeoutMs,
        onlyMainContent: options?.onlyMainContent,
        includeTags: options?.includeTags,
        excludeTags: options?.excludeTags,
      });
      return ok(scrapeFromResponse(url, data, latency(start)));
    } catch (cause) {
      return err(
        crawlError('provider', `Firecrawl scrape failed: ${String(cause)}`, {
          provider: this.name,
          url,
          cause,
          retryable: true,
        })
      );
    }
  }

  async crawl(seedUrl: string, options?: CrawlOptions): Promise<Result<CrawlResult>> {
    const start = Date.now();
    try {
      const client = await this.getClient();
      const response = await client.crawl(seedUrl, {
        limit: options?.limit,
        maxDepth: options?.maxDepth,
        allowBackwardLinks: options?.allowBackwardLinks,
        allowExternalLinks: options?.allowExternalLinks,
        includePaths: options?.includePaths,
        excludePaths: options?.excludePaths,
        scrapeOptions: options?.scrapeOptions,
        pollInterval: (options?.pollIntervalMs ?? this.opts.pollIntervalMs ?? 2000) / 1000,
        timeout: options?.timeoutMs ?? this.opts.timeoutMs,
      });

      const docs = Array.isArray(response.data)
        ? response.data
        : Array.isArray((response as { docs?: unknown[] }).docs)
          ? ((response as { docs: Record<string, unknown>[] }).docs ?? [])
          : [];

      const pages = docs.map((doc) =>
        scrapeFromResponse(
          String((doc.metadata as Record<string, unknown>)?.sourceURL ?? seedUrl),
          doc,
          latency(start)
        )
      );

      return ok({
        pages,
        completed: response.status !== 'failed',
        providerJobId: typeof response.id === 'string' ? response.id : undefined,
        latencyMs: latency(start),
      });
    } catch (cause) {
      return err(
        crawlError('provider', `Firecrawl crawl failed: ${String(cause)}`, {
          provider: this.name,
          url: seedUrl,
          cause,
          retryable: true,
        })
      );
    }
  }

  async map(url: string, options?: MapOptions): Promise<Result<MapResult>> {
    const start = Date.now();
    try {
      const client = await this.getClient();
      const response = await client.map(url, {
        search: options?.search,
        limit: options?.limit,
        includeSubdomains: options?.includeSubdomains,
        sitemap: options?.sitemap,
      });
      const links = Array.isArray(response.links)
        ? (response.links as string[])
        : Array.isArray(response.urls)
          ? (response.urls as string[])
          : [];
      return ok({ urls: links, latencyMs: latency(start) });
    } catch (cause) {
      return err(
        crawlError('provider', `Firecrawl map failed: ${String(cause)}`, {
          provider: this.name,
          url,
          cause,
          retryable: true,
        })
      );
    }
  }

  async extract(urls: string[], options?: ExtractOptions): Promise<Result<ExtractResult[]>> {
    const start = Date.now();
    try {
      const client = await this.getClient();
      if (!client.extract) {
        return err(
          crawlError('provider', 'Firecrawl extract not available in client', {
            provider: this.name,
            retryable: false,
          })
        );
      }
      const response = await client.extract({
        urls,
        prompt: options?.prompt,
        schema: options?.schema,
        systemPrompt: options?.systemPrompt,
      });
      const data = response.data ?? response;
      const items: ExtractResult[] = urls.map((url) => ({
        url,
        data,
        sources: Array.isArray(response.sources)
          ? (response.sources as ExtractResult['sources'])
          : undefined,
        latencyMs: latency(start),
      }));
      return ok(items);
    } catch (cause) {
      return err(
        crawlError('provider', `Firecrawl extract failed: ${String(cause)}`, {
          provider: this.name,
          cause,
          retryable: true,
        })
      );
    }
  }

  async search(query: string, options?: SearchOptions): Promise<Result<SearchResult>> {
    const start = Date.now();
    try {
      const client = await this.getClient();
      if (!client.search) {
        return err(
          crawlError('provider', 'Firecrawl search not available in client', {
            provider: this.name,
            retryable: false,
          })
        );
      }
      const response = await client.search(query, {
        limit: options?.limit,
        lang: options?.lang,
        country: options?.country,
        scrapeOptions: options?.scrapeOptions,
      });
      const raw = response as Record<string, unknown>;
      const data = raw.data as Record<string, unknown> | undefined;
      const web = (raw.web ?? data?.web ?? raw.results ?? []) as Array<Record<string, unknown>>;
      return ok({
        results: web.map((r) => ({
          url: String(r.url ?? ''),
          title: typeof r.title === 'string' ? r.title : undefined,
          description: typeof r.description === 'string' ? r.description : undefined,
          markdown: typeof r.markdown === 'string' ? r.markdown : undefined,
        })),
        latencyMs: latency(start),
      });
    } catch (cause) {
      return err(
        crawlError('provider', `Firecrawl search failed: ${String(cause)}`, {
          provider: this.name,
          cause,
          retryable: true,
        })
      );
    }
  }

  async health(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await this.getClient();
      return {
        provider: this.name,
        healthy: true,
        latencyMs: latency(start),
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
      canonicalUrl: scrape.metadata?.canonical as string | undefined,
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
