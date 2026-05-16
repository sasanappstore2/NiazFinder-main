import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';
import { CACHE_TTL_KEY } from '../decorators/cache-ttl.decorator';
import { CACHE_AUTH_KEY } from '../decorators/cache-auth.decorator';

/**
 * Redis cache interceptor that caches GET request responses.
 *
 * Behavior:
 * - Caches only GET requests (safe, idempotent)
 * - Uses `CACHE_TTL_KEY` metadata for per-endpoint TTL (default: 60s)
 * - Skips caching for authenticated requests unless @CacheAuth() is used
 * - Listens to Redis Pub/Sub for cache invalidation on mutations
 * - Cache key format: `cache:{method}:{url}` (normalized, query-string included)
 */
@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisCacheInterceptor.name);

  /** Default TTL for cached responses (seconds) */
  private readonly DEFAULT_TTL = 60;

  /** Cache key prefix */
  private readonly KEY_PREFIX = 'cache:';

  constructor(
    private readonly reflector: Reflector,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {
    // Subscribe to invalidation channel for multi-instance sync
    this.redis.subscribe('cache:invalidate', (data: { keys: string[] }) => {
      if (data?.keys) {
        for (const key of data.keys) {
          this.redis.del(key);
        }
        this.logger.debug(`Invalidated ${data.keys.length} cache key(s) via Pub/Sub`);
      }
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method !== 'GET') {
      // On mutation methods, publish cache invalidation
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        this.invalidateRelatedCaches(request);
      }
      return next.handle();
    }

    // Skip caching for authenticated requests unless @CacheAuth is present
    const allowAuthCache = this.reflector.get<boolean>(CACHE_AUTH_KEY, context.getHandler());
    if (request.headers?.authorization && !allowAuthCache) {
      return next.handle();
    }

    // Determine TTL from decorator or use default
    const customTtl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());
    const ttl = customTtl ?? this.DEFAULT_TTL;

    // Build cache key from method + full URL
    const cacheKey = this.buildCacheKey(request);

    return new Observable((subscriber) => {
      // Try to get from cache
      this.redis.get(cacheKey).then((cached) => {
        if (cached) {
          this.logger.debug(`Cache HIT: ${cacheKey}`);
          try {
            const parsed = JSON.parse(cached);
            subscriber.next(parsed);
            subscriber.complete();
            return;
          } catch {
            // Malformed cache — fall through
          }
        }

        this.logger.debug(`Cache MISS: ${cacheKey}`);

        // Cache miss — call handler and cache the response
        next.handle().pipe(
          tap((data) => {
            // Only cache successful responses
            if (data && response.statusCode >= 200 && response.statusCode < 300) {
              this.redis.set(cacheKey, JSON.stringify(data), ttl);
            }
          }),
        ).subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      }).catch(() => {
        // Redis error — pass through without caching
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }

  /**
   * Build a normalized cache key from the request.
   * Format: `cache:GET:/api/requests?page=1&limit=10`
   */
  private buildCacheKey(request: any): string {
    const method = request.method.toUpperCase();
    const url = request.url || request.path || '/';
    return `${this.KEY_PREFIX}${method}:${url}`;
  }

  /**
   * Invalidate caches related to a mutation request.
   *
   * Strategy:
   * - For POST/PUT/DELETE, we derive related cache keys based on the URL path
   * - We also publish to the `cache:invalidate` channel for multi-instance sync
   */
  private invalidateRelatedCaches(request: any): void {
    try {
      const url = request.url || request.path || '';
      const method = request.method.toUpperCase();
      const pathSegments = url.split('?')[0].split('/').filter(Boolean);

      // Build pattern-based keys to invalidate
      const keysToInvalidate: string[] = [];

      // Invalidate the exact path listing cache
      // e.g., POST /api/requests → invalidate cache:GET:/api/requests*
      const basePath = pathSegments.slice(0, 3).join('/'); // e.g., "api/requests"
      keysToInvalidate.push(`${this.KEY_PREFIX}GET:/${basePath}`);

      // Invalidate any collection cache with query params
      keysToInvalidate.push(`${this.KEY_PREFIX}GET:/${basePath}?*`);

      // If there's an ID in the path, also invalidate detail caches
      if (pathSegments.length >= 4 && pathSegments[3].length > 0) {
        const detailPath = pathSegments.slice(0, 4).join('/');
        keysToInvalidate.push(`${this.KEY_PREFIX}GET:/${detailPath}`);
      }

      // Find and delete matching keys from Redis
      for (const pattern of keysToInvalidate) {
        if (pattern.endsWith('*')) {
          this.redis.keys(pattern.replace('*', '')).then((keys) => {
            for (const key of keys) {
              this.redis.del(key);
            }
            if (keys.length > 0) {
              this.logger.debug(`Invalidated ${keys.length} cache key(s) for pattern: ${pattern}`);
            }
          });
        } else {
          this.redis.del(pattern);
        }
      }

      // Publish to Pub/Sub for other instances
      this.redis.publish('cache:invalidate', { keys: keysToInvalidate, method, url });
    } catch (err) {
      this.logger.debug(`Cache invalidation error: ${(err as Error).message}`);
    }
  }
}
