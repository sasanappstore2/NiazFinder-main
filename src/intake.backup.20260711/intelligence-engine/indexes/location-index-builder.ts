import type { LocationIndexRecord } from '@/intake/intelligence-engine/indexes/location-fuse-index';
import {
  clearLocationIndexCache,
  loadLocationIndexRecords,
} from '@/intake/intelligence-engine/indexes/location-fuse-index';

const LOC_INDEX_REDIS_KEY = 'intake:loc-index:v1';
const LOC_INDEX_TTL_SEC = 60 * 60;

function locIndexRedisEnabled(): boolean {
  return (
    process.env.NEED_INTAKE_LOC_INDEX_REDIS === 'true' && Boolean(process.env.REDIS_URL?.trim())
  );
}

/** Build Fuse index from Prisma/JSON and optionally persist to Redis for warm restarts. */
export async function buildLocationIndex(): Promise<LocationIndexRecord[]> {
  return loadLocationIndexRecords();
}

export async function warmLocationIndexCache(): Promise<{ count: number; redis: boolean }> {
  clearLocationIndexCache();
  const records = await buildLocationIndex();

  if (locIndexRedisEnabled()) {
    try {
      const redisUrl = process.env.REDIS_URL!.trim();
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      await redis.connect().catch(() => redis);
      await redis.setex(LOC_INDEX_REDIS_KEY, LOC_INDEX_TTL_SEC, JSON.stringify(records));
      await redis.quit().catch(() => undefined);
      return { count: records.length, redis: true };
    } catch {
      return { count: records.length, redis: false };
    }
  }

  return { count: records.length, redis: false };
}

export async function loadWarmLocationIndexRecords(): Promise<LocationIndexRecord[] | null> {
  if (!locIndexRedisEnabled()) return null;

  try {
    const redisUrl = process.env.REDIS_URL!.trim();
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect().catch(() => redis);
    const raw = await redis.get(LOC_INDEX_REDIS_KEY);
    await redis.quit().catch(() => undefined);
    if (!raw) return null;
    return JSON.parse(raw) as LocationIndexRecord[];
  } catch {
    return null;
  }
}

export {
  getLocationFuseIndex,
  searchLocationIndex,
  clearLocationIndexCache,
} from '@/intake/intelligence-engine/indexes/location-fuse-index';

export type {
  LocationIndexRecord,
  LocationFuseMatch,
  LocationMatchTier,
} from '@/intake/intelligence-engine/indexes/location-fuse-index';
