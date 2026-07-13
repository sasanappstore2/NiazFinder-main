import type { CrawlJob } from '../../types/crawl-job';
import type { CrawlQueue, JobStore } from '../../interfaces/queue';
import type { PlatformConfigV3 } from '../config/schema';
import { CrawlQueueService, MemoryJobStore } from '../../queue/crawl-queue';

export type QueueDriver = 'memory' | 'bullmq';

/**
 * In-process queue for the Next.js app (filing tick, admin APIs).
 * BullMQ lives in `queue/bullmq/` and is loaded only by `worker-cli.ts` (tsx),
 * so optional deps like `bullmq` are never pulled into the Turbopack bundle.
 */
export async function createCrawlQueueV3(config: PlatformConfigV3): Promise<{
  store: JobStore;
  queue: CrawlQueue;
  driver: QueueDriver;
}> {
  if (config.queue.driver === 'bullmq' && config.queue.redisUrl) {
    console.warn(
      '[crawler-v3] BullMQ is not loaded inside Next.js — using in-memory queue. ' +
        'Run `npm run worker:crawler-v3` for distributed workers (requires bullmq).'
    );
  }

  const store = new MemoryJobStore();
  const queue = new CrawlQueueService(store, {
    concurrency: config.queue.concurrency,
    maxRetries: config.queue.maxRetries,
    backoffBaseMs: config.queue.backoffBaseMs,
    backoffMaxMs: config.queue.backoffMaxMs,
    rateLimitPerMinute: config.queue.rateLimitPerMinute,
  });

  return { store, queue, driver: 'memory' };
}

export type { CrawlJob };
