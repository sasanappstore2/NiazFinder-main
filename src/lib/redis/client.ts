import type Redis from 'ioredis';
import { resolveRedisUrl } from '@/lib/communication/redis-url';

let client: Redis | null = null;
let connectAttempted = false;

export function filingRedisEnabled(): boolean {
  return process.env.FILING_CACHE_REDIS === 'true' && Boolean(resolveRedisUrl()?.trim());
}

export async function getRedisClient(): Promise<Redis | null> {
  if (!filingRedisEnabled()) return null;
  if (client) return client;
  if (connectAttempted) return null;

  connectAttempted = true;
  const url = resolveRedisUrl();
  if (!url) return null;

  try {
    const { default: RedisCtor } = await import('ioredis');
    client = new RedisCtor(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await client.connect();
    return client;
  } catch (err) {
    console.warn('[redis] filing cache client unavailable:', err);
    client = null;
    return null;
  }
}

export async function closeRedisClient(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client?.disconnect();
  }
  client = null;
  connectAttempted = false;
}
