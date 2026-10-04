#!/usr/bin/env npx tsx
/**
 * BullMQ worker entrypoint for Crawler Platform V3.
 * Usage: CRAWLER_V3_ENABLED=true CRAWLER_QUEUE_DRIVER=bullmq CRAWLER_REDIS_URL=redis://127.0.0.1:6379 npm run worker:crawler-v3
 */
import { loadPlatformConfigV3 } from '../config/loader';
import { CrawlerPlatformService } from '../api/platform-service';
import { runBullMqCrawlWorker } from './worker';

async function main(): Promise<void> {
  const config = loadPlatformConfigV3();
  if (config.queue.driver !== 'bullmq' || !config.queue.redisUrl) {
    console.error('Set CRAWLER_QUEUE_DRIVER=bullmq and CRAWLER_REDIS_URL');
    process.exit(1);
  }

  const platform = CrawlerPlatformService.create();
  console.log('[crawler-v3-worker] listening on queue:', config.queue.queueName);

  await runBullMqCrawlWorker(config, async (job) => {
    await platform.startCrawl({
      config: {
        sourceId: job.siteKey,
        seedUrls: job.config.seedUrls,
        provider: job.config.provider,
        maxPages: job.config.maxPages,
        metadata: job.config.metadata,
      },
      priority: job.priority,
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
