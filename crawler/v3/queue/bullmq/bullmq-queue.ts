import type { CrawlJob } from '../../../types/crawl-job';
import type { CrawlError } from '../../../types/errors';
import type { CrawlQueue, EnqueueOptions, JobStore, QueueJobHandle } from '../../../interfaces/queue';
import type { PlatformConfigV3 } from '../../config/schema';
import { computeBackoffMs, shouldRetry } from '../../../queue/retry-policy';
import type { QueueFactory } from '../queue-factory';
import { MemoryJobStore } from '../../../queue/crawl-queue';

type BullMqModule = typeof import('bullmq');

async function loadBullMq(): Promise<BullMqModule> {
  return import('bullmq');
}

function priorityWeight(p: CrawlJob['priority']): number {
  switch (p) {
    case 'critical':
      return 1;
    case 'high':
      return 2;
    case 'normal':
      return 3;
    default:
      return 4;
  }
}

/** Redis-backed job metadata store (queue state lives in BullMQ). */
export class RedisJobStore implements JobStore {
  constructor(private readonly prefix = 'crawler:v3:job:') {}

  private key(jobId: string): string {
    return `${this.prefix}${jobId}`;
  }

  private async redis() {
    const Redis = (await import('ioredis')).default;
    const url = process.env.CRAWLER_REDIS_URL ?? process.env.REDIS_URL;
    if (!url) throw new Error('CRAWLER_REDIS_URL required for BullMQ job store');
    return new Redis(url, { maxRetriesPerRequest: null });
  }

  async save(job: CrawlJob): Promise<void> {
    const client = await this.redis();
    try {
      await client.set(this.key(job.id), JSON.stringify(job));
    } finally {
      client.disconnect();
    }
  }

  async load(jobId: string): Promise<CrawlJob | null> {
    const client = await this.redis();
    try {
      const raw = await client.get(this.key(jobId));
      return raw ? (JSON.parse(raw) as CrawlJob) : null;
    } finally {
      client.disconnect();
    }
  }

  async updateProgress(jobId: string, patch: Partial<CrawlJob['progress']>): Promise<void> {
    const job = await this.load(jobId);
    if (!job) return;
    job.progress = { ...job.progress, ...patch, updatedAt: new Date().toISOString() };
    job.updatedAt = job.progress.updatedAt;
    await this.save(job);
  }

  async appendError(jobId: string, error: CrawlJob['errors'][number]): Promise<void> {
    const job = await this.load(jobId);
    if (!job) return;
    job.errors.push(error);
    job.updatedAt = new Date().toISOString();
    await this.save(job);
  }

  async setStatus(jobId: string, status: CrawlJob['status']): Promise<void> {
    const job = await this.load(jobId);
    if (!job) return;
    job.status = status;
    job.updatedAt = new Date().toISOString();
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      job.completedAt = job.updatedAt;
    }
    await this.save(job);
  }
}

export class BullMQCrawlQueue implements CrawlQueue {
  private queue: import('bullmq').Queue | null = null;
  private dlq: import('bullmq').Queue | null = null;
  private paused = new Set<string>();
  private cancelled = new Set<string>();

  constructor(
    private readonly store: JobStore,
    private readonly config: PlatformConfigV3
  ) {}

  private async getQueue(): Promise<import('bullmq').Queue> {
    if (this.queue) return this.queue;
    const { Queue } = await loadBullMq();
    const connection = { url: this.config.queue.redisUrl! };
    this.queue = new Queue(this.config.queue.queueName, {
      connection,
      defaultJobOptions: {
        attempts: this.config.queue.maxRetries + 1,
        backoff: { type: 'exponential', delay: this.config.queue.backoffBaseMs },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    });
    this.dlq = new Queue(`${this.config.queue.queueName}:dlq`, { connection });
    return this.queue;
  }

  async enqueue(job: CrawlJob, options?: EnqueueOptions): Promise<void> {
    job.status = 'queued';
    await this.store.save(job);
    const q = await this.getQueue();
    await q.add(
      'crawl',
      { jobId: job.id },
      {
        jobId: job.id,
        priority: priorityWeight(options?.priority ?? job.priority),
        delay: options?.delayMs ?? 0,
      }
    );
  }

  async dequeue(): Promise<QueueJobHandle | null> {
    return null;
  }

  async pause(jobId: string): Promise<boolean> {
    this.paused.add(jobId);
    await this.store.setStatus(jobId, 'paused');
    const q = await this.getQueue();
    const job = await q.getJob(jobId);
    if (job) await job.remove();
    return true;
  }

  async resume(jobId: string): Promise<boolean> {
    this.paused.delete(jobId);
    const job = await this.store.load(jobId);
    if (!job) return false;
    await this.enqueue(job);
    return true;
  }

  async cancel(jobId: string): Promise<boolean> {
    this.cancelled.add(jobId);
    await this.store.setStatus(jobId, 'cancelled');
    const q = await this.getQueue();
    const job = await q.getJob(jobId);
    if (job) await job.remove();
    return true;
  }

  async get(jobId: string): Promise<CrawlJob | null> {
    return this.store.load(jobId);
  }

  async list(status?: CrawlJob['status']) {
    const q = await this.getQueue();
    const waiting = await q.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed'], 0, 200);
    const jobs: CrawlJob[] = [];
    for (const bj of waiting) {
      const id = String(bj.data?.jobId ?? bj.id);
      const full = await this.store.load(id);
      if (full && (!status || full.status === status)) {
        jobs.push(full);
      }
    }
    return jobs.map((j) => ({
      id: j.id,
      siteKey: j.siteKey,
      status: j.status,
      priority: j.priority,
      progress: j.progress,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      completedAt: j.completedAt,
    }));
  }

  async moveToDeadLetter(jobId: string, error: CrawlError): Promise<void> {
    await this.store.appendError(jobId, error);
    await this.store.setStatus(jobId, 'failed');
    if (this.dlq) {
      await this.dlq.add('dead', { jobId, error });
    }
  }

  async length(): Promise<number> {
    const q = await this.getQueue();
    const counts = await q.getJobCounts('waiting', 'delayed', 'active');
    return (counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.active ?? 0);
  }
}

export function createBullMqQueueFactory(): QueueFactory {
  return {
    createJobStore(config: PlatformConfigV3): JobStore {
      if (!config.queue.redisUrl) return new MemoryJobStore();
      return new RedisJobStore();
    },
    createQueue(config: PlatformConfigV3, store: JobStore): CrawlQueue {
      return new BullMQCrawlQueue(store, config);
    },
  };
}
