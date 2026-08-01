import { z } from 'zod';
import { providerNameSchemaV3 } from '../config/schema';

export const discoveryStrategySchema = z.enum([
  'seed-only',
  'recursive',
  'sitemap',
  'pagination',
  'map-api',
  'category-pages',
  'custom',
]);

export const extractionStrategySchema = z.enum([
  'dom',
  'schema',
  'json-ld',
  'microdata',
  'llm',
  'firecrawl-extract',
  'custom-parser',
  'hybrid',
]);

export const crawlSourceSchema = z.object({
  id: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  enabled: z.boolean().default(true),
  provider: providerNameSchemaV3,
  seedUrls: z.array(z.string().url()).min(1),
  authenticationRequired: z.boolean().default(false),
  visibility: z.enum(['public', 'private', 'mixed']).default('public'),
  crawlFrequencyMinutes: z.number().int().min(1).max(43_200).default(60),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  discoveryStrategy: discoveryStrategySchema.default('recursive'),
  extractionStrategy: extractionStrategySchema.default('hybrid'),
  normalizationPipeline: z.array(z.string()).default(['generic-property']),
  schedulingPolicy: z
    .object({
      jitterMinutes: z.number().int().min(0).max(120).default(4),
      maxConcurrentJobs: z.number().int().min(1).max(20).default(1),
      timezone: z.string().default('Asia/Tehran'),
    })
    .prefault({}),
  validationRules: z.array(z.string()).default(['property-record']),
  dedupeRules: z.array(z.string()).default(['multi-signal']),
  storagePolicy: z
    .object({
      retainRawHtml: z.boolean().default(true),
      retainMarkdown: z.boolean().default(true),
      retainSnapshots: z.boolean().default(true),
      retainErrors: z.boolean().default(true),
    })
    .prefault({}),
  featureFlags: z.record(z.string(), z.boolean()).default({}),
  allowedDomains: z.array(z.string()).default([]),
  includePatterns: z.array(z.string()).default([]),
  excludePatterns: z.array(z.string()).default([]),
  maxPages: z.number().int().min(1).max(100_000).default(100),
  maxDepth: z.number().int().min(0).max(20).default(2),
  metadata: z.record(z.string(), z.unknown()).default({}),
  providerConfig: z.record(z.string(), z.unknown()).default({}),
});

export type CrawlSource = z.infer<typeof crawlSourceSchema>;

export type CrawlSourceScheduleState = {
  sourceId: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  nextRunAt: string | null;
  failureCount: number;
  lastError: string | null;
};
