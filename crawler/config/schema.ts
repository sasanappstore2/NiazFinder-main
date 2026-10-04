import { z } from 'zod';

export const providerNameSchema = z.enum([
  'firecrawl',
  'playwright',
  'http',
  'cheerio',
  'estate-scrape-legacy',
]);

export const crawlerConfigSchema = z.object({
  version: z.literal(2).default(2),
  defaultProvider: providerNameSchema.default('firecrawl'),
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
        })
        .prefault({}),
      http: z
        .object({
          timeoutMs: z.number().int().default(30_000),
          userAgent: z.string().optional(),
          proxy: z.string().optional(),
        })
        .prefault({}),
    })
    .prefault({}),
  queue: z
    .object({
      concurrency: z.number().int().min(1).max(50).default(3),
      maxRetries: z.number().int().min(0).max(20).default(5),
      backoffBaseMs: z.number().int().default(2000),
      backoffMaxMs: z.number().int().default(120_000),
      rateLimitPerMinute: z.number().int().min(1).default(60),
      persistPath: z.string().optional(),
    })
    .prefault({}),
  discovery: z
    .object({
      maxDepth: z.number().int().min(0).max(20).default(3),
      maxUrls: z.number().int().min(1).max(1_000_000).default(10_000),
      respectRobotsTxt: z.boolean().default(true),
    })
    .prefault({}),
  pipeline: z
    .object({
      aiEnrichment: z.boolean().default(false),
      deduplication: z.boolean().default(true),
      batchSize: z.number().int().min(1).max(500).default(25),
      retainRawHtml: z.boolean().default(true),
    })
    .prefault({}),
  storage: z
    .object({
      driver: z.enum(['memory', 'file', 'prisma']).default('memory'),
      basePath: z.string().default('.crawler-data'),
    })
    .prefault({}),
  featureFlags: z
    .object({
      crawlerV2: z.boolean().default(false),
      firecrawlPrimary: z.boolean().default(true),
      legacyEstateScrapeFallback: z.boolean().default(true),
    })
    .prefault({}),
});

export type CrawlerConfig = z.infer<typeof crawlerConfigSchema>;

export const crawlJobConfigSchema = z.object({
  seedUrls: z.array(z.string().url()).min(1),
  provider: providerNameSchema.optional(),
  maxPages: z.number().int().min(1).max(100_000).default(100),
  maxDepth: z.number().int().min(0).max(20).default(2),
  concurrency: z.number().int().min(1).max(20).optional(),
  rateLimitPerMinute: z.number().int().min(1).optional(),
  includePatterns: z.array(z.string()).default([]),
  excludePatterns: z.array(z.string()).default([]),
  allowedDomains: z.array(z.string()).default([]),
  respectRobotsTxt: z.boolean().optional(),
  incremental: z.boolean().default(true),
  aiEnrichment: z.boolean().optional(),
  deduplication: z.boolean().optional(),
  parserId: z.string().optional(),
  extractSchema: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CrawlJobConfigInput = z.infer<typeof crawlJobConfigSchema>;
