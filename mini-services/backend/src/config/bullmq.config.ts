import { DynamicModule, Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const QUEUE_NAMES = [
  'notification',
  'email',
  'cleanup',
  'search-index',
  'intake-heavy',
  'request-moderation',
  'intake-analyze',
  'intake-listing-copy',
  'intake-dead-letter',
] as const;

@Global()
@Module({})
export class BullMQConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: BullMQConfigModule,
      imports: [
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const logger = new Logger('BullMQ');
            const redisOptions = {
              host: config.get<string>('BULLMQ_REDIS_HOST') || config.get<string>('REDIS_HOST') || 'localhost',
              port: config.get<number>('BULLMQ_REDIS_PORT') || config.get<number>('REDIS_PORT') || 6379,
              password: config.get('REDIS_PASSWORD') || undefined,
            };

            logger.log(`Connecting to Redis at ${redisOptions.host}:${redisOptions.port}`);

            return {
              connection: redisOptions,
              defaultJobOptions: {
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
                attempts: 3,
                backoff: {
                  type: 'exponential',
                  delay: 2000,
                },
              },
            };
          },
        }),
      ],
      exports: [BullModule],
    };
  }

  static registerQueues(): DynamicModule {
    return {
      module: BullMQConfigModule,
      imports: [
        ...QUEUE_NAMES.map((name) =>
          BullModule.registerQueue({
            name,
          }),
        ),
      ],
      exports: [BullModule],
    };
  }
}
