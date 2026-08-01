import { z } from 'zod';
import { ALL_FILING_FIELD_KEYS } from '@/lib/filing/schema/attribute-schema';

export const FILING_FIELD_KEYS = ALL_FILING_FIELD_KEYS;

export type FilingFieldKey = (typeof FILING_FIELD_KEYS)[number];

const fieldExtractorSchema = z.object({
  scope: z.enum(['item', 'page', 'detail']).optional(),
  selector: z.string().max(500).optional(),
  attr: z.enum(['textContent', 'innerHTML', 'href']).optional(),
  regex: z.string().max(500).optional(),
  regexGroup: z.number().int().min(0).max(10).optional(),
  transform: z.enum(['trim', 'digits', 'toman', 'persianDigits']).optional(),
});

const paginationSchema = z.object({
  mode: z.enum(['nextButton', 'urlTemplate', 'ajaxPost']).optional(),
  selector: z.string().max(500).optional(),
  urlTemplate: z.string().max(500).optional(),
  maxPages: z.number().int().min(1).max(100).optional(),
});

const authSchema = z.object({
  usernameSelector: z.string().max(500).optional(),
  passwordSelector: z.string().max(500).optional(),
  submitSelector: z.string().max(500).optional(),
  waitAfterLoginMs: z.number().int().min(0).max(30_000).optional(),
  loginSuccessUrlPattern: z.string().max(200).optional(),
  storageStatePath: z.string().max(500).optional(),
});

const antiBotSchema = z.object({
  minDelayMs: z.number().int().min(0).max(30_000).optional(),
  maxDelayMs: z.number().int().min(0).max(60_000).optional(),
  maxRetries: z.number().int().min(1).max(10).optional(),
  warmup: z.boolean().optional(),
  usePlaywrightFallback: z.boolean().optional(),
  scrollJitter: z.boolean().optional(),
  viewportRandomize: z.boolean().optional(),
});

const listPageSchema = z.object({
  fetchMode: z.enum(['dom', 'ajaxHtml']).optional(),
  containerSelector: z.string().max(500).optional(),
  itemLinkSelector: z.string().max(500).optional(),
  pagination: paginationSchema.optional(),
  dedupField: z.enum(['fileCode', 'externalId', 'title']).optional(),
});

const listApiSchema = z.object({
  baseUrl: z.string().max(500).optional(),
  endpoint: z.string().max(500).optional(),
  method: z.enum(['GET', 'POST']).optional(),
  pageParam: z.string().max(80).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
  maxPages: z.number().int().min(1).max(200).optional(),
  contentType: z.string().max(120).optional(),
  filters: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const detailPageSchema = z.object({
  enabled: z.boolean().optional(),
  linkFromList: z.boolean().optional(),
  enrichAfterImport: z.boolean().optional(),
  waitMs: z.number().int().min(0).max(30_000).optional(),
  skipIfKnown: z.boolean().optional(),
  maxConcurrent: z.number().int().min(1).max(10).optional(),
  delayMs: z.number().int().min(0).max(30_000).optional(),
  fieldOverrides: z.record(z.string(), fieldExtractorSchema).optional(),
});

const neighborhoodParseSchema = z.object({
  splitOn: z.string().max(10).optional(),
  cityIndex: z.number().int().min(0).max(5).optional(),
  neighborhoodIndex: z.number().int().min(0).max(5).optional(),
});

const llmFallbackSchema = z.object({
  enabled: z.boolean().optional(),
  customPrompt: z.string().max(4000).optional(),
});

const portalMapListPageSchema = z.object({
  url: z.string().max(2000),
  dealType: z.string().max(80).optional().nullable(),
  propertyKind: z.string().max(80).optional().nullable(),
  containerSelector: z.string().max(500).optional().nullable(),
  fieldMapOverrides: z.record(z.string(), fieldExtractorSchema).optional(),
});

const portalMapSchema = z.object({
  listPages: z.array(portalMapListPageSchema).optional(),
});

/** CrawlBlueprint v2 — stored in RegionalFilingScraper.siteConfigJson */
export const crawlBlueprintSchema = z.object({
  version: z.literal(2).optional(),
  portalFamily: z.string().max(80).optional(),
  auth: authSchema.optional(),
  antiBot: antiBotSchema.optional(),
  listPage: listPageSchema.optional(),
  listApi: listApiSchema.optional(),
  detailPage: detailPageSchema.optional(),
  fieldMap: z.record(z.string(), fieldExtractorSchema).optional(),
  portalMap: portalMapSchema.optional(),
  parsers: z.record(z.string(), z.string()).optional(),
  titleTemplate: z.string().max(200).optional(),
  neighborhoodParse: neighborhoodParseSchema.optional(),
  llmFallback: llmFallbackSchema.optional(),
  // legacy v1 fields (still supported)
  usernameSelector: z.string().optional(),
  passwordSelector: z.string().optional(),
  submitSelector: z.string().optional(),
  waitAfterLoginMs: z.number().int().min(0).max(30_000).optional(),
  customPrompt: z.string().max(4000).optional(),
});

export type CrawlBlueprint = z.infer<typeof crawlBlueprintSchema>;
export type FieldExtractor = z.infer<typeof fieldExtractorSchema>;

export function parseCrawlBlueprint(json: string): CrawlBlueprint {
  try {
    const raw = JSON.parse(json || '{}') as Record<string, unknown>;
    const parsed = crawlBlueprintSchema.safeParse(raw);
    return parsed.success ? parsed.data : (raw as CrawlBlueprint);
  } catch {
    return {};
  }
}

/** Merge legacy v1 login selectors into auth block for estate-scrape. */
export function blueprintToSiteConfig(blueprint: CrawlBlueprint): Record<string, unknown> {
  const auth = blueprint.auth ?? {};
  return {
    version: blueprint.version ?? (blueprint.listPage?.containerSelector ? 2 : 1),
    auth: {
      usernameSelector:
        auth.usernameSelector ?? blueprint.usernameSelector,
      passwordSelector:
        auth.passwordSelector ?? blueprint.passwordSelector,
      submitSelector:
        auth.submitSelector ?? blueprint.submitSelector,
      waitAfterLoginMs:
        auth.waitAfterLoginMs ?? blueprint.waitAfterLoginMs,
      loginSuccessUrlPattern: auth.loginSuccessUrlPattern,
    },
    antiBot: blueprint.antiBot ?? {
      minDelayMs: 800,
      maxDelayMs: 3200,
      scrollJitter: true,
      viewportRandomize: true,
    },
    listPage: blueprint.listPage,
    listApi: blueprint.listApi,
    portalFamily: blueprint.portalFamily,
    detailPage: blueprint.detailPage,
    fieldMap: blueprint.fieldMap,
    portalMap: blueprint.portalMap,
    parsers: blueprint.parsers,
    titleTemplate: blueprint.titleTemplate,
    neighborhoodParse: blueprint.neighborhoodParse,
    llmFallback: blueprint.llmFallback ?? {
      enabled: Boolean(blueprint.customPrompt),
      customPrompt: blueprint.customPrompt,
    },
    // flat legacy keys for older scraper.py paths
    usernameSelector: auth.usernameSelector ?? blueprint.usernameSelector,
    passwordSelector: auth.passwordSelector ?? blueprint.passwordSelector,
    submitSelector: auth.submitSelector ?? blueprint.submitSelector,
    waitAfterLoginMs: auth.waitAfterLoginMs ?? blueprint.waitAfterLoginMs,
    customPrompt: blueprint.llmFallback?.customPrompt ?? blueprint.customPrompt,
  };
}
