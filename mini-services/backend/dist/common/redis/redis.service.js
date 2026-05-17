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
var RedisService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let RedisService = RedisService_1 = class RedisService {
    constructor(client, publisher, subscriber) {
        this.client = client;
        this.publisher = publisher;
        this.subscriber = subscriber;
        this.logger = new common_1.Logger(RedisService_1.name);
        this.subscriptions = new Map();
        this.subscriber.on('message', (channel, message) => {
            const callback = this.subscriptions.get(channel);
            if (callback) {
                try {
                    callback(JSON.parse(message));
                }
                catch {
                }
            }
        });
        this.client.connect().catch((err) => this.logger.warn(`Redis client not available: ${err.message}. Features requiring Redis will be degraded.`));
        this.publisher.connect().catch(() => { });
        this.subscriber.connect().catch(() => { });
    }
    async onModuleDestroy() {
        try {
            await this.client.quit();
        }
        catch { }
        try {
            await this.publisher.quit();
        }
        catch { }
        try {
            await this.subscriber.quit();
        }
        catch { }
    }
    connected() {
        return this.client.status === 'ready';
    }
    isConnected() {
        return this.connected();
    }
    async get(key) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — get('${key}') returning null`);
            return null;
        }
        try {
            return await this.client.get(key);
        }
        catch (err) {
            this.logger.warn(`Redis get error: ${err.message}`);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — set('${key}') skipped`);
            return;
        }
        try {
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, value);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch (err) {
            this.logger.warn(`Redis set error: ${err.message}`);
        }
    }
    async del(key) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — del('${key}') skipped`);
            return;
        }
        try {
            await this.client.del(key);
        }
        catch (err) {
            this.logger.warn(`Redis del error: ${err.message}`);
        }
    }
    async exists(key) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — exists('${key}') returning false`);
            return false;
        }
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (err) {
            this.logger.warn(`Redis exists error: ${err.message}`);
            return false;
        }
    }
    async increment(key) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — increment('${key}') returning 0`);
            return 0;
        }
        try {
            return await this.client.incr(key);
        }
        catch (err) {
            this.logger.warn(`Redis increment error: ${err.message}`);
            return 0;
        }
    }
    async sadd(key, ...members) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — sadd('${key}') returning 0`);
            return 0;
        }
        try {
            return await this.client.sadd(key, ...members);
        }
        catch (err) {
            this.logger.warn(`Redis sadd error: ${err.message}`);
            return 0;
        }
    }
    async srem(key, ...members) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — srem('${key}') returning 0`);
            return 0;
        }
        try {
            return await this.client.srem(key, ...members);
        }
        catch (err) {
            this.logger.warn(`Redis srem error: ${err.message}`);
            return 0;
        }
    }
    async smembers(key) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — smembers('${key}') returning []`);
            return [];
        }
        try {
            return await this.client.smembers(key);
        }
        catch (err) {
            this.logger.warn(`Redis smembers error: ${err.message}`);
            return [];
        }
    }
    async hset(key, field, value) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — hset('${key}', '${field}') skipped`);
            return;
        }
        try {
            await this.client.hset(key, field, value);
        }
        catch (err) {
            this.logger.warn(`Redis hset error: ${err.message}`);
        }
    }
    async hget(key, field) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — hget('${key}', '${field}') returning null`);
            return null;
        }
        try {
            return await this.client.hget(key, field);
        }
        catch (err) {
            this.logger.warn(`Redis hget error: ${err.message}`);
            return null;
        }
    }
    async hgetall(key) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — hgetall('${key}') returning {}`);
            return {};
        }
        try {
            return await this.client.hgetall(key);
        }
        catch (err) {
            this.logger.warn(`Redis hgetall error: ${err.message}`);
            return {};
        }
    }
    async publish(channel, message) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — publish('${channel}') returning 0`);
            return 0;
        }
        try {
            const payload = typeof message === 'string' ? message : JSON.stringify(message);
            return await this.publisher.publish(channel, payload);
        }
        catch (err) {
            this.logger.warn(`Redis publish error: ${err.message}`);
            return 0;
        }
    }
    subscribe(channel, callback) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — subscribe('${channel}') skipped`);
            return;
        }
        try {
            this.subscriptions.set(channel, callback);
            this.subscriber.subscribe(channel);
        }
        catch (err) {
            this.logger.warn(`Redis subscribe error: ${err.message}`);
        }
    }
    unsubscribe(channel) {
        if (!this.connected()) {
            return;
        }
        try {
            this.subscriptions.delete(channel);
            this.subscriber.unsubscribe(channel);
        }
        catch (err) {
            this.logger.warn(`Redis unsubscribe error: ${err.message}`);
        }
    }
    async keys(pattern) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — keys('${pattern}') returning []`);
            return [];
        }
        try {
            return await this.client.keys(pattern);
        }
        catch (err) {
            this.logger.warn(`Redis keys error: ${err.message}`);
            return [];
        }
    }
    async flushdb() {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — flushdb() skipped`);
            return;
        }
        try {
            await this.client.flushdb();
        }
        catch (err) {
            this.logger.warn(`Redis flushdb error: ${err.message}`);
        }
    }
    async getTtl(key) {
        if (!this.connected()) {
            this.logger.warn(`Redis not connected — getTtl('${key}') returning -2`);
            return -2;
        }
        try {
            return await this.client.ttl(key);
        }
        catch (err) {
            this.logger.warn(`Redis ttl error: ${err.message}`);
            return -2;
        }
    }
    async setWithTTL(key, value, ttlSeconds) {
        return this.set(key, value, ttlSeconds);
    }
    async isAllowed(key, ttlSeconds, maxAttempts = 1) {
        if (!this.connected()) {
            return true;
        }
        try {
            const current = await this.client.incr(key);
            if (current === 1) {
                await this.client.expire(key, ttlSeconds);
            }
            return current <= maxAttempts;
        }
        catch {
            return true;
        }
    }
    async expire(key, seconds) {
        if (!this.connected())
            return;
        try {
            await this.client.expire(key, seconds);
        }
        catch { }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __param(1, (0, common_1.Inject)('REDIS_PUB')),
    __param(2, (0, common_1.Inject)('REDIS_SUB')),
    __metadata("design:paramtypes", [typeof (_a = typeof ioredis_1.Redis !== "undefined" && ioredis_1.Redis) === "function" ? _a : Object, typeof (_b = typeof ioredis_1.Redis !== "undefined" && ioredis_1.Redis) === "function" ? _b : Object, typeof (_c = typeof ioredis_1.Redis !== "undefined" && ioredis_1.Redis) === "function" ? _c : Object])
], RedisService);
//# sourceMappingURL=redis.service.js.map