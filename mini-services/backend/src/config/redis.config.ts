import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export const REDIS_DEFAULT = 'REDIS_DEFAULT';
export const REDIS_PUBLISHER = 'REDIS_PUBLISHER';
export const REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';
export const REDIS_BULLMQ = 'REDIS_BULLMQ';

export interface RedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export function getRedisToken(name: string): string {
  return `REDIS_${name.toUpperCase()}`;
}

function createRedisProvider(token: string, options: RedisOptions): Provider {
  return {
    provide: token,
    useFactory: () => {
      const logger = new Logger(`Redis[${token}]`);
      const redis = new Redis({
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

      // Attempt to connect - but don't fail if Redis is unavailable
      redis.connect().catch((err) => {
        logger.warn(
          `Redis at ${options.host}:${options.port} is unavailable - running in degraded mode`,
        );
      });

      return redis;
    },
    inject: [ConfigService],
  };
}

@Global()
@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: 'REDIS_OPTIONS',
          inject: [ConfigService],
          useFactory: (config: ConfigService): RedisOptions => ({
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD') || undefined,
            db: config.get<number>('REDIS_DB', 0),
          }),
        },
        {
          provide: REDIS_DEFAULT,
          inject: ['REDIS_OPTIONS'],
          useFactory: (options: RedisOptions) => {
            const logger = new Logger('Redis[default]');
            const redis = new Redis({
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
          provide: REDIS_PUBLISHER,
          inject: ['REDIS_OPTIONS'],
          useFactory: (options: RedisOptions) => {
            const logger = new Logger('Redis[pub]');
            const redis = new Redis({
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
          provide: REDIS_SUBSCRIBER,
          inject: ['REDIS_OPTIONS'],
          useFactory: (options: RedisOptions) => {
            const logger = new Logger('Redis[sub]');
            const redis = new Redis({
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
          provide: REDIS_BULLMQ,
          inject: ['REDIS_OPTIONS'],
          useFactory: (options: RedisOptions) => {
            const logger = new Logger('Redis[bullmq]');
            const redis = new Redis({
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
      exports: [REDIS_DEFAULT, REDIS_PUBLISHER, REDIS_SUBSCRIBER, REDIS_BULLMQ, 'REDIS_OPTIONS'],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: RedisModule,
    };
  }
}
