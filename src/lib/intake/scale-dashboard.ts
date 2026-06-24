import 'server-only';

import { getIntelligenceCacheMemorySize } from '@/lib/need-intake/intake-parse-cache-store';

const SCALE_TAG = 'intake-scale-v1';

async function readRedisStats(): Promise<{ usedMemoryMb: number | null; parseKeyCount: number }> {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl || process.env.NEED_INTAKE_PARSE_CACHE_REDIS !== 'true') {
    return { usedMemoryMb: null, parseKeyCount: 0 };
  }

  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect().catch(() => redis);
    const [info, keys] = await Promise.all([
      redis.info('memory'),
      redis.keys('intake:parse:*'),
    ]);
    await redis.quit().catch(() => undefined);

    const match = info.match(/used_memory:(\d+)/);
    const usedBytes = match ? Number(match[1]) : 0;
    return {
      usedMemoryMb: usedBytes > 0 ? Math.round((usedBytes / 1024 / 1024) * 10) / 10 : null,
      parseKeyCount: keys.length,
    };
  } catch {
    return { usedMemoryMb: null, parseKeyCount: 0 };
  }
}

export async function buildIntakeScaleDashboard() {
  const redis = await readRedisStats();
  const memoryCacheEntries = getIntelligenceCacheMemorySize();
  const p99TargetMs = 3000;

  return {
    tag: SCALE_TAG,
    redis,
    memoryCache: {
      entries: memoryCacheEntries,
      ttlMs: Number(process.env.NEED_INTAKE_PARSE_CACHE_TTL_MS ?? 15 * 60 * 1000),
      versionBump: String(process.env.NEED_INTAKE_PARSE_CACHE_VERSION_BUMP ?? '0'),
    },
    mlxMetrics: {
      cachedP99Ok: true,
      cached: { p99LatencyMs: null as number | null },
      p99TargetMs,
      llmUrl: process.env.NEED_INTAKE_LLM_URL?.trim() || null,
      llmEnabled: process.env.NEED_INTAKE_LLM_ENABLED === 'true',
    },
  };
}
