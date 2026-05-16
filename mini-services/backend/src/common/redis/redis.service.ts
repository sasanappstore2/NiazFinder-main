import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private subscriptions: Map<string, (data: any) => void> = new Map();

  constructor(
    @Inject('REDIS_CLIENT') private readonly client: Redis,
    @Inject('REDIS_PUB') private readonly publisher: Redis,
    @Inject('REDIS_SUB') private readonly subscriber: Redis,
  ) {
    // Set up subscriber message handler
    this.subscriber.on('message', (channel: string, message: string) => {
      const callback = this.subscriptions.get(channel);
      if (callback) {
        try {
          callback(JSON.parse(message));
        } catch {
          // Ignore parse errors
        }
      }
    });

    // Connect with graceful degradation
    this.client.connect().catch((err) =>
      this.logger.warn(`Redis client not available: ${err.message}. Features requiring Redis will be degraded.`),
    );
    this.publisher.connect().catch(() => {});
    this.subscriber.connect().catch(() => {});
  }

  async onModuleDestroy() {
    try { await this.client.quit(); } catch {}
    try { await this.publisher.quit(); } catch {}
    try { await this.subscriber.quit(); } catch {}
  }

  private connected(): boolean {
    return this.client.status === 'ready';
  }

  isConnected(): boolean {
    return this.connected();
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — get('${key}') returning null`);
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(`Redis get error: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — set('${key}') skipped`);
      return;
    }
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.warn(`Redis set error: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — del('${key}') skipped`);
      return;
    }
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis del error: ${(err as Error).message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — exists('${key}') returning false`);
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      this.logger.warn(`Redis exists error: ${(err as Error).message}`);
      return false;
    }
  }

  async increment(key: string): Promise<number> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — increment('${key}') returning 0`);
      return 0;
    }
    try {
      return await this.client.incr(key);
    } catch (err) {
      this.logger.warn(`Redis increment error: ${(err as Error).message}`);
      return 0;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — sadd('${key}') returning 0`);
      return 0;
    }
    try {
      return await this.client.sadd(key, ...members);
    } catch (err) {
      this.logger.warn(`Redis sadd error: ${(err as Error).message}`);
      return 0;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — srem('${key}') returning 0`);
      return 0;
    }
    try {
      return await this.client.srem(key, ...members);
    } catch (err) {
      this.logger.warn(`Redis srem error: ${(err as Error).message}`);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — smembers('${key}') returning []`);
      return [];
    }
    try {
      return await this.client.smembers(key);
    } catch (err) {
      this.logger.warn(`Redis smembers error: ${(err as Error).message}`);
      return [];
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — hset('${key}', '${field}') skipped`);
      return;
    }
    try {
      await this.client.hset(key, field, value);
    } catch (err) {
      this.logger.warn(`Redis hset error: ${(err as Error).message}`);
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — hget('${key}', '${field}') returning null`);
      return null;
    }
    try {
      return await this.client.hget(key, field);
    } catch (err) {
      this.logger.warn(`Redis hget error: ${(err as Error).message}`);
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — hgetall('${key}') returning {}`);
      return {};
    }
    try {
      return await this.client.hgetall(key);
    } catch (err) {
      this.logger.warn(`Redis hgetall error: ${(err as Error).message}`);
      return {};
    }
  }

  async publish(channel: string, message: any): Promise<number> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — publish('${channel}') returning 0`);
      return 0;
    }
    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      return await this.publisher.publish(channel, payload);
    } catch (err) {
      this.logger.warn(`Redis publish error: ${(err as Error).message}`);
      return 0;
    }
  }

  subscribe(channel: string, callback: (data: any) => void): void {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — subscribe('${channel}') skipped`);
      return;
    }
    try {
      this.subscriptions.set(channel, callback);
      this.subscriber.subscribe(channel);
    } catch (err) {
      this.logger.warn(`Redis subscribe error: ${(err as Error).message}`);
    }
  }

  unsubscribe(channel: string): void {
    if (!this.connected()) {
      return;
    }
    try {
      this.subscriptions.delete(channel);
      this.subscriber.unsubscribe(channel);
    } catch (err) {
      this.logger.warn(`Redis unsubscribe error: ${(err as Error).message}`);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — keys('${pattern}') returning []`);
      return [];
    }
    try {
      return await this.client.keys(pattern);
    } catch (err) {
      this.logger.warn(`Redis keys error: ${(err as Error).message}`);
      return [];
    }
  }

  async flushdb(): Promise<void> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — flushdb() skipped`);
      return;
    }
    try {
      await this.client.flushdb();
    } catch (err) {
      this.logger.warn(`Redis flushdb error: ${(err as Error).message}`);
    }
  }

  async getTtl(key: string): Promise<number> {
    if (!this.connected()) {
      this.logger.warn(`Redis not connected — getTtl('${key}') returning -2`);
      return -2;
    }
    try {
      return await this.client.ttl(key);
    } catch (err) {
      this.logger.warn(`Redis ttl error: ${(err as Error).message}`);
      return -2;
    }
  }

  // ─── Utility: set with TTL alias ───
  async setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  // ─── Utility: rate limiter ───
  async isAllowed(key: string, ttlSeconds: number, maxAttempts: number = 1): Promise<boolean> {
    if (!this.connected()) {
      return true; // Allow if Redis is down
    }
    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return current <= maxAttempts;
    } catch {
      return true;
    }
  }

  // ─── Utility: set with expiration ───
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.connected()) return;
    try {
      await this.client.expire(key, seconds);
    } catch {}
  }
}
