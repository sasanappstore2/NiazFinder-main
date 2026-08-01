import { z } from 'zod';

export const providerNameSchemaV3 = z.enum([
  'firecrawl',
  'playwright',
  'http',
  'api',
  'cheerio',
  'estate-scrape-legacy',
  'future-browser',
]);

export const platformConfigSchemaV3 = z.object({
  version: z.literal(3).default(3),
  defaultProvider: providerNameSchemaV3.default('firecrawl'),
  providers: z
    .object({
      firecrawl: z
        .object({
          apiKey: z.string().optional(),
          baseUrl: z.string().url().optional(),
          timeoutMs: z.number().int().min(1000).max(600_000).default(120_000),
          pollIntervalMs: z.number().int().min(500).max(60_000).default(2000),
        })
        .prefault({}),
      playwright: z
        .object({
          headless: z.boolean().default(true),
          timeoutMs: z.number().int().default(60_000),
          estateScrapeUrl: z.string().url().optional(),
        })
        .prefault({}),
      http: z
        .object({
          timeoutMs: z.number().int().default(30_000),
          userAgent: z.string().optional(),
          proxy: z.string().optional(),
        })
        .prefault({}),
      api: z
        .object({
          timeoutMs: z.number().int().default(30_000),
        })
        .prefault({}),
      'estate-scrape-legacy': z
        .object({
          baseUrl: z.string().url().optional(),
          secret: z.string().optional(),
        })
        .prefault({}),
    })
    .prefault({}),
  queue: z
    .object({
      driver: z.enum(['memory', 'bullmq']).default('memory'),
      redisUrl: z.string().optional(),
      queueName: z.string().default('crawler-v3'),
      concurrency: z.number().int().min(1).max(50).default(3),
      maxRetries: z.number().int().min(0).max(20).default(5),
      backoffBaseMs: z.number().int().default(2000),
      backoffMaxMs: z.number().int().default(120_000),
      rateLimitPerMinute: z.number().int().min(1).default(60),
    })
    .prefault({}),
  scheduler: z
    .object({
      enabled: z.boolean().default(true),
      tickIntervalMs: z.number().int().min(5_000).default(60_000),
      maxDuePerTick: z.number().int().min(1).max(100).default(10),
    })
    .prefault({}),
  discovery: z
    .object({
      maxDepth: z.number().int().min(0).max(20).default(3),
      maxUrls: z.number().int().min(1).max(1_000_000).default(10_000),
      respectRobotsTxt: z.boolean().default(true),
      visitedCacheTtlHours: z.number().int().min(1).max(720).default(168),
    })
    .prefault({}),
  pipeline: z
    .object({
      aiEnrichment: z.boolean().default(false),
      deduplication: z.boolean().default(true),
      batchSize: z.number().int().min(1).max(500).default(25),
      retainRawHtml: z.boolean().default(true),
      retainMarkdown: z.boolean().default(true),
      streaming: z.boolean().default(true),
    })
    .prefault({}),
  storage: z
    .object({
      driver: z.enum(['memory', 'file', 'prisma']).default('memory'),
      basePath: z.string().default('.crawler-data/v3'),
    })
    .prefault({}),
  monitoring: z
    .object({
      prometheusEnabled: z.boolean().default(true),
      metricsPrefix: z.string().default('niazfinder_crawler'),
    })
    .prefault({}),
  featureFlags: z
    .object({
      crawlerV3: z.boolean().default(false),
      crawlerV2: z.boolean().default(false),
      firecrawlPrimary: z.boolean().default(true),
      legacyEstateScrapeFallback: z.boolean().default(true),
    })
    .prefault({}),
  sourcesPath: z.string().optional(),
});

export type PlatformConfigV3 = z.infer<typeof platformConfigSchemaV3>;

export const crawlJobConfigSchemaV3 = z.object({
  sourceId: z.string().min(2),
  seedUrls: z.array(z.string().url()).min(1),
  provider: providerNameSchemaV3.optional(),
  maxPages: z.number().int().min(1).max(100_000).default(100),
  maxDepth: z.number().int().min(0).max(20).default(2),
  concurrency: z.number().int().min(1).max(20).optional(),
  rateLimitPerMinute: z.number().int().min(1).optional(),
  includePatterns: z.array(z.string()).default([]),
  excludePatterns: z.array(z.string()).default([]),
  allowedDomains: z.array(z.string()).default([]),
  respectRobotsTxt: z.boolean().optional(),
  incremental: z.boolean().default(true),
  extractionStrategy: z.string().optional(),
  aiEnrichment: z.boolean().optional(),
  deduplication: z.boolean().optional(),
  parserId: z.string().optional(),
  extractSchema: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CrawlJobConfigV3 = z.infer<typeof crawlJobConfigSchemaV3>;
