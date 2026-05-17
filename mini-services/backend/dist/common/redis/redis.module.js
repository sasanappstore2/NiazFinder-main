"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RedisModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("./redis.service");
let RedisModule = RedisModule_1 = class RedisModule {
    static forRoot() {
        const redisProvider = {
            provide: 'REDIS_CLIENT',
            useFactory: () => {
                const redis = new (require('ioredis').default || require('ioredis'))({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD || undefined,
                    db: parseInt(process.env.REDIS_DB || '0'),
                    retryStrategy: (times) => Math.min(times * 200, 5000),
                    maxRetriesPerRequest: 3,
                    lazyConnect: true,
                });
                redis.on('error', (err) => {
                    console.warn('⚠️ Redis connection error (service will degrade gracefully):', err.message);
                });
                redis.on('connect', () => {
                    console.log('✅ Redis connected');
                });
                return redis;
            },
        };
        const redisPubProvider = {
            provide: 'REDIS_PUB',
            useFactory: () => {
                const redis = new (require('ioredis').default || require('ioredis'))({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD || undefined,
                    db: parseInt(process.env.REDIS_DB || '0'),
                    retryStrategy: (times) => Math.min(times * 200, 5000),
                    maxRetriesPerRequest: 3,
                    lazyConnect: true,
                });
                redis.on('error', (err) => console.warn('⚠️ Redis Pub error:', err.message));
                return redis;
            },
        };
        const redisSubProvider = {
            provide: 'REDIS_SUB',
            useFactory: () => {
                const redis = new (require('ioredis').default || require('ioredis'))({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD || undefined,
                    db: parseInt(process.env.REDIS_DB || '0'),
                    retryStrategy: (times) => Math.min(times * 200, 5000),
                    maxRetriesPerRequest: 3,
                    lazyConnect: true,
                });
                redis.on('error', (err) => console.warn('⚠️ Redis Sub error:', err.message));
                return redis;
            },
        };
        return {
            module: RedisModule_1,
            providers: [redisProvider, redisPubProvider, redisSubProvider],
            exports: ['REDIS_CLIENT', 'REDIS_PUB', 'REDIS_SUB', redis_service_1.RedisService],
        };
    }
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = RedisModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [redis_service_1.RedisService],
        exports: [redis_service_1.RedisService],
    })
], RedisModule);
//# sourceMappingURL=redis.module.js.map