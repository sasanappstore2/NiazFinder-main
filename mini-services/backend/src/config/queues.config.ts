import { DynamicModule, Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

/**
 * Standalone BullMQ queues configuration.
 * Used alongside BullMQConfigModule for explicit queue registration.
 */
@Global()
@Module({})
export class QueuesConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: QueuesConfigModule,
      imports: [
        BullModule.forRoot({
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
          },
          defaultJobOptions: {
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        }),
      ],
      exports: [BullModule],
    };
  }
}
