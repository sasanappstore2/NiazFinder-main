import type { PlatformConfigV3 } from '../../config/schema';
import type { CrawlJob } from '../../../types/crawl-job';
import { BullMQCrawlQueue } from './bullmq-queue';
import { computeBackoffMs, shouldRetry } from '../../../queue/retry-policy';

/** Long-running BullMQ worker process entrypoint. */
export async function runBullMqCrawlWorker(
  config: PlatformConfigV3,
  handler: (job: CrawlJob, attempt: number) => Promise<void>
): Promise<void> {
  if (!config.queue.redisUrl) {
    throw new Error('CRAWLER_REDIS_URL required for BullMQ worker');
  }

  const { Worker } = await import('bullmq');
  const store = new BullMQCrawlQueue(new (await import('./bullmq-queue')).RedisJobStore(), config);

  const worker = new Worker(
    config.queue.queueName,
    async (bullJob) => {
      const jobId = String(bullJob.data?.jobId ?? bullJob.id);
      const job = await store.get(jobId);
      if (!job) return;
      const attempt = bullJob.attemptsMade + 1;
      try {
        await handler(job, attempt);
        await store.get(jobId).then(async (j) => {
          if (j) {
            const { MemoryJobStore } = await import('../../../queue/crawl-queue');
            const mem = new MemoryJobStore();
            await mem.setStatus(jobId, 'completed');
          }
        });
      } catch (cause) {
        const retryable = true;
        const error = {
          code: 'job_failed' as const,
          message: String(cause),
          retryable,
          at: new Date().toISOString(),
        };
        if (!shouldRetry(attempt, config.queue.maxRetries, retryable)) {
          await store.moveToDeadLetter(jobId, error);
        } else {
          const delay = computeBackoffMs(attempt, config.queue.backoffBaseMs, config.queue.backoffMaxMs);
          throw new Error(`retry in ${delay}ms: ${error.message}`);
        }
      }
    },
    {
      connection: { url: config.queue.redisUrl },
      concurrency: config.queue.concurrency,
      limiter: { max: config.queue.rateLimitPerMinute, duration: 60_000 },
    }
  );

  await new Promise<void>((resolve, reject) => {
    worker.on('failed', (job, err) => {
      if (job && job.attemptsMade >= config.queue.maxRetries) {
        console.error('[crawler-v3-worker] job failed', job.id, err);
      }
    });
    worker.on('error', reject);
    process.on('SIGINT', () => {
      void worker.close().then(resolve);
    });
    process.on('SIGTERM', () => {
      void worker.close().then(resolve);
    });
  });
}
