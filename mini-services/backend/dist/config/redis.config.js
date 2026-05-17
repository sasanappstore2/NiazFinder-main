"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RedisModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = exports.REDIS_BULLMQ = exports.REDIS_SUBSCRIBER = exports.REDIS_PUBLISHER = exports.REDIS_DEFAULT = void 0;
exports.getRedisToken = getRedisToken;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const common_2 = require("@nestjs/common");
exports.REDIS_DEFAULT = 'REDIS_DEFAULT';
exports.REDIS_PUBLISHER = 'REDIS_PUBLISHER';
exports.REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';
exports.REDIS_BULLMQ = 'REDIS_BULLMQ';
function getRedisToken(name) {
    return `REDIS_${name.toUpperCase()}`;
}
function createRedisProvider(token, options) {
    return {
        provide: token,
        useFactory: () => {
            const logger = new common_2.Logger(`Redis[${token}]`);
            const redis = new ioredis_1.default({
                host: options.host,
                port: options.port,
                password: options.password || undefined,
                db: options.db || 0,
                lazyConnect: true,
                retryStrategy(times) {
                    const delay = Math.min(times * 200, 5000);
                    logger.warn(`Retrying connection in ${delay}ms (attempt ${times})`);
                    return delay;
                },
                maxRetriesPerRequest: null,
            });
            redis.on('connect', () => logger.log('Connected successfully'));
            redis.on('error', (err) => logger.error(`Connection error: ${err.message}`));
            redis.on('close', () => logger.warn('Connection closed'));
            redis.connect().catch((err) => {
                logger.warn(`Redis at ${options.host}:${options.port} is unavailable - running in degraded mode`);
            });
            return redis;
        },
        inject: [config_1.ConfigService],
    };
}
let RedisModule = RedisModule_1 = class RedisModule {
    static forRoot() {
        return {
            module: RedisModule_1,
            providers: [
                {
                    provide: 'REDIS_OPTIONS',
                    inject: [config_1.ConfigService],
                    useFactory: (config) => ({
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                        password: config.get('REDIS_PASSWORD') || undefined,
                        db: config.get('REDIS_DB', 0),
                    }),
                },
                {
                    provide: exports.REDIS_DEFAULT,
                    inject: ['REDIS_OPTIONS'],
                    useFactory: (options) => {
                        const logger = new common_2.Logger('Redis[default]');
                        const redis = new ioredis_1.default({
                            host: options.host,
                            port: options.port,
                            password: options.password || undefined,
                            db: options.db || 0,
                            lazyConnect: true,
                            retryStrategy(times) {
                                return Math.min(times * 200, 5000);
                            },
                            maxRetriesPerRequest: null,
                        });
                        redis.on('connect', () => logger.log('Connected'));
                        redis.on('error', (err) => logger.warn(`Error: ${err.message}`));
                        redis.connect().catch(() => {
                            logger.warn('Redis unavailable - degraded mode');
                        });
                        return redis;
                    },
                },
                {
                    provide: exports.REDIS_PUBLISHER,
                    inject: ['REDIS_OPTIONS'],
                    useFactory: (options) => {
                        const logger = new common_2.Logger('Redis[pub]');
                        const redis = new ioredis_1.default({
                            host: options.host,
                            port: options.port,
                            password: options.password || undefined,
                            db: options.db || 0,
                            lazyConnect: true,
                            retryStrategy(times) {
                                return Math.min(times * 200, 5000);
                            },
                            maxRetriesPerRequest: null,
                        });
                        redis.on('connect', () => logger.log('Publisher connected'));
                        redis.on('error', (err) => logger.warn(`Publisher error: ${err.message}`));
                        redis.connect().catch(() => {
                            logger.warn('Redis publisher unavailable');
                        });
                        return redis;
                    },
                },
                {
                    provide: exports.REDIS_SUBSCRIBER,
                    inject: ['REDIS_OPTIONS'],
                    useFactory: (options) => {
                        const logger = new common_2.Logger('Redis[sub]');
                        const redis = new ioredis_1.default({
                            host: options.host,
                            port: options.port,
                            password: options.password || undefined,
                            db: options.db || 0,
                            lazyConnect: true,
                            retryStrategy(times) {
                                return Math.min(times * 200, 5000);
                            },
                            maxRetriesPerRequest: null,
                        });
                        redis.on('connect', () => logger.log('Subscriber connected'));
                        redis.on('error', (err) => logger.warn(`Subscriber error: ${err.message}`));
                        redis.connect().catch(() => {
                            logger.warn('Redis subscriber unavailable');
                        });
                        return redis;
                    },
                },
                {
                    provide: exports.REDIS_BULLMQ,
                    inject: ['REDIS_OPTIONS'],
                    useFactory: (options) => {
                        const logger = new common_2.Logger('Redis[bullmq]');
                        const redis = new ioredis_1.default({
                            host: options.host,
                            port: options.port,
                            password: options.password || undefined,
                            db: options.db || 0,
                            lazyConnect: true,
                            maxRetriesPerRequest: null,
                        });
                        redis.on('connect', () => logger.log('BullMQ Redis connected'));
                        redis.on('error', (err) => logger.warn(`BullMQ Redis error: ${err.message}`));
                        redis.connect().catch(() => {
                            logger.warn('BullMQ Redis unavailable - queues disabled');
                        });
                        return redis;
                    },
                },
            ],
            exports: [exports.REDIS_DEFAULT, exports.REDIS_PUBLISHER, exports.REDIS_SUBSCRIBER, exports.REDIS_BULLMQ, 'REDIS_OPTIONS'],
        };
    }
    static forFeature() {
        return {
            module: RedisModule_1,
        };
    }
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = RedisModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], RedisModule);
//# sourceMappingURL=redis.config.js.map