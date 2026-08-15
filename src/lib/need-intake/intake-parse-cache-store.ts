import { createHash } from 'crypto';
import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';

const INTAKE_PARSE_CACHE_VERSION = 'v5-fast-enrich';

interface CacheEntry {
  result: IntakeIntelligenceResult;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry>();

function defaultTtlMs(): number {
  const n = Number(process.env.NEED_INTAKE_PARSE_CACHE_TTL_MS ?? 15 * 60 * 1000);
  return Number.isFinite(n) && n > 0 ? n : 15 * 60 * 1000;
}

function redisEnabled(): boolean {
  return process.env.NEED_INTAKE_PARSE_CACHE_REDIS === 'true' && Boolean(process.env.REDIS_URL?.trim());
}

function serializeFormHints(
  formHints?: {
    categorySlug?: string;
    subcategorySlug?: string;
    city?: string;
    neighborhood?: string;
    categoryLockedByUser?: boolean;
  } | null
): string {
  if (!formHints) return '';
  return [
    formHints.categorySlug ?? '',
    formHints.subcategorySlug ?? '',
    formHints.city ?? '',
    formHints.neighborhood ?? '',
    formHints.categoryLockedByUser ? '1' : '0',
  ].join(':');
}

export function buildParseCacheKey(
  text: string,
  citySlug?: string | null,
  cityName?: string | null,
  formHints?: {
    categorySlug?: string;
    subcategorySlug?: string;
    city?: string;
    neighborhood?: string;
    categoryLockedByUser?: boolean;
  } | null,
  forceAi?: boolean,
  enrich?: boolean
): string {
  const payload = [
    INTAKE_PARSE_CACHE_VERSION,
    String(process.env.NEED_INTAKE_PARSE_CACHE_VERSION_BUMP ?? '0'),
    text.trim().toLowerCase(),
    citySlug ?? '',
    cityName ?? '',
    serializeFormHints(formHints),
    forceAi ? 'fa1' : 'fa0',
    enrich ? 'e1' : 'e0',
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

export async function getIntelligenceCache(
  key: string
): Promise<IntakeIntelligenceResult | null> {
  const mem = memoryStore.get(key);
  if (mem) {
    if (Date.now() > mem.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return mem.result;
  }

  if (redisEnabled()) {
    try {
      const redisUrl = process.env.REDIS_URL!.trim();
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      await redis.connect().catch(() => redis);
      const raw = await redis.get(`intake:parse:${key}`);
      await redis.quit().catch(() => undefined);
      if (raw) {
        const parsed = JSON.parse(raw) as IntakeIntelligenceResult;
        memoryStore.set(key, { result: parsed, expiresAt: Date.now() + defaultTtlMs() });
        return parsed;
      }
    } catch {
      /* redis unavailable */
    }
  }

  return null;
}

export async function setIntelligenceCache(
  key: string,
  result: IntakeIntelligenceResult
): Promise<void> {
  const entry: CacheEntry = { result, expiresAt: Date.now() + defaultTtlMs() };
  memoryStore.set(key, entry);
  if (memoryStore.size > 500) {
    const first = memoryStore.keys().next().value;
    if (first) memoryStore.delete(first);
  }

  if (redisEnabled()) {
    try {
      const redisUrl = process.env.REDIS_URL!.trim();
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      await redis.connect().catch(() => redis);
      await redis.setex(`intake:parse:${key}`, Math.ceil(defaultTtlMs() / 1000), JSON.stringify(result));
      await redis.quit().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
}

export function clearIntelligenceCache(): void {
  memoryStore.clear();
}
