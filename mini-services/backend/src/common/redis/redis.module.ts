import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {
  static forRoot(): DynamicModule {
    const redisProvider: Provider = {
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

    const redisPubProvider: Provider = {
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

    const redisSubProvider: Provider = {
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
      module: RedisModule,
      providers: [redisProvider, redisPubProvider, redisSubProvider, RedisService],
      exports: ['REDIS_CLIENT', 'REDIS_PUB', 'REDIS_SUB', RedisService],
    };
  }
}
