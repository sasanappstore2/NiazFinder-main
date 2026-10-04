import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { crawlerConfigSchema, type CrawlerConfig } from './schema';

const ENV_PREFIX = 'CRAWLER_';

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  if (!v) return fallback;
  return v === '1' || v === 'true' || v === 'yes';
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key]?.trim();
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function applyEnvOverrides(base: CrawlerConfig): CrawlerConfig {
  return crawlerConfigSchema.parse({
    ...base,
    defaultProvider: (process.env.CRAWLER_DEFAULT_PROVIDER as CrawlerConfig['defaultProvider']) ?? base.defaultProvider,
    providers: {
      ...base.providers,
      firecrawl: {
        ...base.providers.firecrawl,
        apiKey: process.env.FIRECRAWL_API_KEY ?? process.env.CRAWLER_FIRECRAWL_API_KEY ?? base.providers.firecrawl.apiKey,
        baseUrl: process.env.CRAWLER_FIRECRAWL_BASE_URL ?? base.providers.firecrawl.baseUrl,
        timeoutMs: envInt(`${ENV_PREFIX}FIRECRAWL_TIMEOUT_MS`, base.providers.firecrawl.timeoutMs),
      },
      http: {
        ...base.providers.http,
        proxy: process.env.CRAWLER_HTTP_PROXY ?? process.env.FILING_HTTP_PROXY ?? base.providers.http.proxy,
        userAgent: process.env.CRAWLER_HTTP_USER_AGENT ?? base.providers.http.userAgent,
      },
    },
    queue: {
      ...base.queue,
      concurrency: envInt(`${ENV_PREFIX}QUEUE_CONCURRENCY`, base.queue.concurrency),
      maxRetries: envInt(`${ENV_PREFIX}QUEUE_MAX_RETRIES`, base.queue.maxRetries),
      rateLimitPerMinute: envInt(`${ENV_PREFIX}RATE_LIMIT_PER_MIN`, base.queue.rateLimitPerMinute),
      persistPath: process.env.CRAWLER_QUEUE_PERSIST_PATH ?? base.queue.persistPath,
    },
    pipeline: {
      ...base.pipeline,
      aiEnrichment: envBool(`${ENV_PREFIX}AI_ENRICHMENT`, base.pipeline.aiEnrichment),
      deduplication: envBool(`${ENV_PREFIX}DEDUPLICATION`, base.pipeline.deduplication),
    },
    storage: {
      ...base.storage,
      driver: (process.env.CRAWLER_STORAGE_DRIVER as CrawlerConfig['storage']['driver']) ?? base.storage.driver,
      basePath: process.env.CRAWLER_STORAGE_PATH ?? base.storage.basePath,
    },
    featureFlags: {
      crawlerV2: envBool('CRAWLER_V2_ENABLED', base.featureFlags.crawlerV2),
      firecrawlPrimary: envBool('CRAWLER_FIRECRAWL_PRIMARY', base.featureFlags.firecrawlPrimary),
      legacyEstateScrapeFallback: envBool(
        'CRAWLER_LEGACY_FALLBACK',
        base.featureFlags.legacyEstateScrapeFallback
      ),
    },
  });
}

export function loadCrawlerConfig(opts?: { configPath?: string }): CrawlerConfig {
  const defaultsPath = join(__dirname, 'defaults.json');
  let base: CrawlerConfig = crawlerConfigSchema.parse({});

  if (existsSync(defaultsPath)) {
    const raw = JSON.parse(readFileSync(defaultsPath, 'utf8')) as Record<string, unknown>;
    base = crawlerConfigSchema.parse({ ...base, ...raw });
  }

  const customPath = opts?.configPath ?? process.env.CRAWLER_CONFIG_PATH;
  if (customPath && existsSync(customPath)) {
    const raw = JSON.parse(readFileSync(customPath, 'utf8')) as Record<string, unknown>;
    base = crawlerConfigSchema.parse({ ...base, ...raw });
  }

  return applyEnvOverrides(base);
}

let cached: CrawlerConfig | null = null;

export function getCrawlerConfig(): CrawlerConfig {
  if (!cached) cached = loadCrawlerConfig();
  return cached;
}

export function resetCrawlerConfigCache(): void {
  cached = null;
}
