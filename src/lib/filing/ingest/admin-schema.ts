import { z } from 'zod';
import { crawlBlueprintSchema } from '@/lib/filing/ingest/crawl-blueprint';

const siteConfigSchema = crawlBlueprintSchema;

export const filingScraperWriteSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  siteKey: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'فقط حروف کوچک انگلیسی، عدد و خط تیره')
    .optional(),
  enabled: z.boolean().optional(),
  loginUrl: z.string().url().max(500),
  listingsUrl: z.union([z.string().url().max(500), z.literal('')]).optional(),
  username: z.string().trim().max(120).optional().default(''),
  password: z.string().min(1).max(200).optional(),
  siteConfig: siteConfigSchema.optional(),
  defaultCity: z.string().trim().min(2).max(80),
  defaultCityId: z.string().trim().max(64).optional().nullable(),
  defaultNeighborhood: z.string().trim().max(80).optional().nullable(),
  defaultNeighborhoodId: z.string().trim().max(64).optional().nullable(),
  intervalMinutes: z.coerce.number().int().min(5).max(240).optional(),
  jitterMinutes: z.coerce.number().int().min(0).max(30).optional(),
});

export function serializeFilingScraper(row: {
  id: string;
  name: string;
  siteKey: string;
  enabled: boolean;
  loginUrl: string;
  listingsUrl: string;
  username: string;
  defaultCity: string;
  defaultCityId: string | null;
  defaultNeighborhood: string | null;
  defaultNeighborhoodId: string | null;
  intervalMinutes: number;
  jitterMinutes: number;
  status: string;
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastImportedCount: number;
  lastError: string | null;
  siteConfigJson: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { filings: number };
}) {
  let siteConfig = {};
  try {
    siteConfig = JSON.parse(row.siteConfigJson || '{}');
  } catch {
    siteConfig = {};
  }

  return {
    id: row.id,
    name: row.name,
    siteKey: row.siteKey,
    enabled: row.enabled,
    loginUrl: row.loginUrl,
    listingsUrl: row.listingsUrl,
    username: row.username,
    defaultCity: row.defaultCity,
    defaultCityId: row.defaultCityId,
    defaultNeighborhood: row.defaultNeighborhood,
    defaultNeighborhoodId: row.defaultNeighborhoodId,
    intervalMinutes: row.intervalMinutes,
    jitterMinutes: row.jitterMinutes,
    status: row.status,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
    lastImportedCount: row.lastImportedCount,
    lastError: row.lastError,
    siteConfig,
    filingsCount: row._count?.filings ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
