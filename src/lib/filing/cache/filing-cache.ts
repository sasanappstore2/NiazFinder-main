import { createHash } from 'crypto';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import type { FilingBrowseFilters } from '@/lib/filing/browse/apply-filters';
import type { FilingDetailSections } from '@/lib/filing/presentation/detail-sections';
import type { FilingViewModel } from '@/lib/filing/presentation/view-model';
import { filingRedisEnabled, getRedisClient } from '@/lib/redis/client';

const DEFAULT_BROWSE_TTL_SEC = 120;
const DEFAULT_DETAIL_TTL_SEC = 300;

function cacheVersion(): string {
  return process.env.FILING_CACHE_VERSION ?? 'v1';
}

function browseTtlSec(): number {
  const n = Number(process.env.FILING_CACHE_BROWSE_TTL_SEC ?? DEFAULT_BROWSE_TTL_SEC);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_BROWSE_TTL_SEC;
}

function detailTtlSec(): number {
  const n = Number(process.env.FILING_CACHE_DETAIL_TTL_SEC ?? DEFAULT_DETAIL_TTL_SEC);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DETAIL_TTL_SEC;
}

function hashFilters(filters: FilingBrowseFilters, page: number, limit: number): string {
  return createHash('sha256')
    .update(JSON.stringify({ filters, page, limit, v: cacheVersion() }))
    .digest('hex')
    .slice(0, 16);
}

export type FilingBrowseCachePayload = {
  items: WorkspaceFileItem[];
  total: number;
  page: number;
  limit: number;
};

export type FilingDetailCachePayload = {
  filing: FilingViewModel;
  sections: FilingDetailSections;
};

export async function getCachedFilingBrowse(
  cityKey: string,
  filters: FilingBrowseFilters,
  page: number,
  limit: number
): Promise<FilingBrowseCachePayload | null> {
  if (!filingRedisEnabled()) return null;
  const redis = await getRedisClient();
  if (!redis) return null;

  const key = `filing:browse:${cacheVersion()}:${cityKey}:${hashFilters(filters, page, limit)}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FilingBrowseCachePayload;
  } catch {
    return null;
  }
}

export async function setCachedFilingBrowse(
  cityKey: string,
  filters: FilingBrowseFilters,
  page: number,
  limit: number,
  payload: FilingBrowseCachePayload
): Promise<void> {
  if (!filingRedisEnabled()) return;
  const redis = await getRedisClient();
  if (!redis) return;

  const key = `filing:browse:${cacheVersion()}:${cityKey}:${hashFilters(filters, page, limit)}`;
  await redis.set(key, JSON.stringify(payload), 'EX', browseTtlSec());
}

export async function getCachedFilingDetail(id: string): Promise<FilingDetailCachePayload | null> {
  if (!filingRedisEnabled()) return null;
  const redis = await getRedisClient();
  if (!redis) return null;

  const key = `filing:detail:${cacheVersion()}:${id}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FilingDetailCachePayload;
  } catch {
    return null;
  }
}

export async function setCachedFilingDetail(
  id: string,
  payload: FilingDetailCachePayload
): Promise<void> {
  if (!filingRedisEnabled()) return;
  const redis = await getRedisClient();
  if (!redis) return;

  const key = `filing:detail:${cacheVersion()}:${id}`;
  await redis.set(key, JSON.stringify(payload), 'EX', detailTtlSec());
}
