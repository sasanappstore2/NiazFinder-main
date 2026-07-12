import { getRedisClient } from '@/lib/redis/client';

export type FilingCacheInvalidateOpts = {
  cityId?: string | null;
  cityName?: string | null;
  filingId?: string | null;
};

async function deleteByPattern(redis: Awaited<ReturnType<typeof getRedisClient>>, pattern: string) {
  if (!redis) return;
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    if (keys.length) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

export async function invalidateFilingCaches(opts?: FilingCacheInvalidateOpts): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  const version = process.env.FILING_CACHE_VERSION ?? 'v1';

  if (opts?.filingId) {
    await redis.del(`filing:detail:${version}:${opts.filingId}`);
  }

  const cityKeys = [opts?.cityId, opts?.cityName].filter(Boolean) as string[];
  for (const cityKey of cityKeys) {
    await deleteByPattern(redis, `filing:browse:${version}:${cityKey}:*`);
    await redis.del(`filing:stats:${version}:${cityKey}`);
  }

  if (!cityKeys.length && !opts?.filingId) {
    await deleteByPattern(redis, `filing:browse:${version}:*`);
    await deleteByPattern(redis, `filing:detail:${version}:*`);
    await deleteByPattern(redis, `filing:stats:${version}:*`);
  }
}
