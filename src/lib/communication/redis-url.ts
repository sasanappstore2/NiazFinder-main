/** Resolve Redis URL for Next.js server (local dev + Docker). */
export function resolveRedisUrl(): string | null {
  const direct = process.env.REDIS_URL?.trim();
  if (direct) return direct;

  const host = process.env.REDIS_HOST?.trim();
  const port = process.env.REDIS_PORT?.trim() || '6379';
  if (!host) return null;

  // Docker service name `redis` is not reachable from the host Next.js process.
  const resolvedHost =
    host === 'redis' && process.env.NODE_ENV !== 'production' ? '127.0.0.1' : host;

  return `redis://${resolvedHost}:${port}`;
}
