import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import defaults from './defaults.json';
import { platformConfigSchemaV3, type PlatformConfigV3 } from './schema';

const ENV_PREFIX = 'CRAWLER_';

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

let cached: PlatformConfigV3 | null = null;

export function loadPlatformConfigV3(opts?: { configPath?: string }): PlatformConfigV3 {
  const base = platformConfigSchemaV3.parse(defaults);
  let merged = { ...base };

  const path = opts?.configPath ?? process.env.CRAWLER_V3_CONFIG_PATH;
  if (path && existsSync(path)) {
    const file = JSON.parse(readFileSync(resolve(path), 'utf8'));
    merged = platformConfigSchemaV3.parse({ ...merged, ...file });
  }

  merged = platformConfigSchemaV3.parse({
    ...merged,
    defaultProvider: (process.env.CRAWLER_DEFAULT_PROVIDER as PlatformConfigV3['defaultProvider']) ?? merged.defaultProvider,
    queue: {
      ...merged.queue,
      driver: (process.env.CRAWLER_QUEUE_DRIVER as 'memory' | 'bullmq') ?? merged.queue.driver,
      redisUrl:
        process.env.CRAWLER_REDIS_URL ??
        process.env.REDIS_URL ??
        merged.queue.redisUrl,
    },
    providers: {
      ...merged.providers,
      firecrawl: {
        ...merged.providers.firecrawl,
        apiKey: process.env.FIRECRAWL_API_KEY ?? process.env.CRAWLER_FIRECRAWL_API_KEY ?? merged.providers.firecrawl.apiKey,
        baseUrl: process.env.CRAWLER_FIRECRAWL_BASE_URL ?? merged.providers.firecrawl.baseUrl,
        timeoutMs: envInt(`${ENV_PREFIX}FIRECRAWL_TIMEOUT_MS`, merged.providers.firecrawl.timeoutMs),
      },
      playwright: {
        ...merged.providers.playwright,
        estateScrapeUrl:
          process.env.ESTATE_SCRAPE_URL ??
          merged.providers.playwright.estateScrapeUrl,
      },
      'estate-scrape-legacy': {
        ...merged.providers['estate-scrape-legacy'],
        baseUrl: process.env.ESTATE_SCRAPE_URL ?? merged.providers['estate-scrape-legacy'].baseUrl,
        secret: process.env.ESTATE_SCRAPE_SECRET ?? merged.providers['estate-scrape-legacy'].secret,
      },
    },
    featureFlags: {
      ...merged.featureFlags,
      crawlerV3: envBool('CRAWLER_V3_ENABLED', merged.featureFlags.crawlerV3),
      crawlerV2: envBool('CRAWLER_V2_ENABLED', merged.featureFlags.crawlerV2),
      firecrawlPrimary: envBool('CRAWLER_FIRECRAWL_PRIMARY', merged.featureFlags.firecrawlPrimary),
      legacyEstateScrapeFallback: envBool(
        'CRAWLER_LEGACY_ESTATE_SCRAPE_FALLBACK',
        merged.featureFlags.legacyEstateScrapeFallback
      ),
    },
  });

  cached = merged;
  return merged;
}

export function getPlatformConfigV3(): PlatformConfigV3 {
  if (!cached) cached = loadPlatformConfigV3();
  return cached;
}

export function resetPlatformConfigV3(): void {
  cached = null;
}

export function isCrawlerV3Enabled(): boolean {
  return getPlatformConfigV3().featureFlags.crawlerV3;
}
