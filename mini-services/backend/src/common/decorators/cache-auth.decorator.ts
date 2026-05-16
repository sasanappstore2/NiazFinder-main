import { SetMetadata } from '@nestjs/common';

/**
 * Mark an endpoint to allow caching even for authenticated requests.
 * By default, the RedisCacheInterceptor skips caching for requests
 * with an Authorization header. Use this decorator to override.
 */
export const CACHE_AUTH_KEY = 'cache_auth';
export const CacheAuth = () => SetMetadata(CACHE_AUTH_KEY, true);
