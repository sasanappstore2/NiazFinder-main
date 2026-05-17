"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RedisCacheInterceptor_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const redis_service_1 = require("../redis/redis.service");
const cache_ttl_decorator_1 = require("../decorators/cache-ttl.decorator");
const cache_auth_decorator_1 = require("../decorators/cache-auth.decorator");
let RedisCacheInterceptor = RedisCacheInterceptor_1 = class RedisCacheInterceptor {
    constructor(reflector, redis) {
        this.reflector = reflector;
        this.redis = redis;
        this.logger = new common_1.Logger(RedisCacheInterceptor_1.name);
        this.DEFAULT_TTL = 60;
        this.KEY_PREFIX = 'cache:';
        this.redis.subscribe('cache:invalidate', (data) => {
            if (data?.keys) {
                for (const key of data.keys) {
                    this.redis.del(key);
                }
                this.logger.debug(`Invalidated ${data.keys.length} cache key(s) via Pub/Sub`);
            }
        });
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        if (request.method !== 'GET') {
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
                this.invalidateRelatedCaches(request);
            }
            return next.handle();
        }
        const allowAuthCache = this.reflector.get(cache_auth_decorator_1.CACHE_AUTH_KEY, context.getHandler());
        if (request.headers?.authorization && !allowAuthCache) {
            return next.handle();
        }
        const customTtl = this.reflector.get(cache_ttl_decorator_1.CACHE_TTL_KEY, context.getHandler());
        const ttl = customTtl ?? this.DEFAULT_TTL;
        const cacheKey = this.buildCacheKey(request);
        return new rxjs_1.Observable((subscriber) => {
            this.redis.get(cacheKey).then((cached) => {
                if (cached) {
                    this.logger.debug(`Cache HIT: ${cacheKey}`);
                    try {
                        const parsed = JSON.parse(cached);
                        subscriber.next(parsed);
                        subscriber.complete();
                        return;
                    }
                    catch {
                    }
                }
                this.logger.debug(`Cache MISS: ${cacheKey}`);
                next.handle().pipe((0, operators_1.tap)((data) => {
                    if (data && response.statusCode >= 200 && response.statusCode < 300) {
                        this.redis.set(cacheKey, JSON.stringify(data), ttl);
                    }
                })).subscribe({
                    next: (value) => subscriber.next(value),
                    error: (err) => subscriber.error(err),
                    complete: () => subscriber.complete(),
                });
            }).catch(() => {
                next.handle().subscribe({
                    next: (value) => subscriber.next(value),
                    error: (err) => subscriber.error(err),
                    complete: () => subscriber.complete(),
                });
            });
        });
    }
    buildCacheKey(request) {
        const method = request.method.toUpperCase();
        const url = request.url || request.path || '/';
        return `${this.KEY_PREFIX}${method}:${url}`;
    }
    invalidateRelatedCaches(request) {
        try {
            const url = request.url || request.path || '';
            const method = request.method.toUpperCase();
            const pathSegments = url.split('?')[0].split('/').filter(Boolean);
            const keysToInvalidate = [];
            const basePath = pathSegments.slice(0, 3).join('/');
            keysToInvalidate.push(`${this.KEY_PREFIX}GET:/${basePath}`);
            keysToInvalidate.push(`${this.KEY_PREFIX}GET:/${basePath}?*`);
            if (pathSegments.length >= 4 && pathSegments[3].length > 0) {
                const detailPath = pathSegments.slice(0, 4).join('/');
                keysToInvalidate.push(`${this.KEY_PREFIX}GET:/${detailPath}`);
            }
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
                }
                else {
                    this.redis.del(pattern);
                }
            }
            this.redis.publish('cache:invalidate', { keys: keysToInvalidate, method, url });
        }
        catch (err) {
            this.logger.debug(`Cache invalidation error: ${err.message}`);
        }
    }
};
exports.RedisCacheInterceptor = RedisCacheInterceptor;
exports.RedisCacheInterceptor = RedisCacheInterceptor = RedisCacheInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(redis_service_1.RedisService)),
    __metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object, redis_service_1.RedisService])
], RedisCacheInterceptor);
//# sourceMappingURL=redis-cache.interceptor.js.map