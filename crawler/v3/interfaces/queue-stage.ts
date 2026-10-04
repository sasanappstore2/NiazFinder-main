import type { CrawlJob } from '../../types/crawl-job';
import type { CrawlQueue, JobStore } from '../../interfaces/queue';

export interface IQueueStage extends CrawlQueue {
  driver(): 'memory' | 'bullmq';
  jobStore(): JobStore;
  enqueueJob(job: CrawlJob): Promise<void>;
}

export type { CrawlQueue, JobStore };
