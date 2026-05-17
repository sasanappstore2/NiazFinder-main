import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RedisService } from '../redis/redis.service';
export declare class RedisCacheInterceptor implements NestInterceptor {
    private readonly reflector;
    private readonly redis;
    private readonly logger;
    private readonly DEFAULT_TTL;
    private readonly KEY_PREFIX;
    constructor(reflector: Reflector, redis: RedisService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private buildCacheKey;
    private invalidateRelatedCaches;
}
