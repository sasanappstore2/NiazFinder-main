import type { CrawlJob, CrawlJobSnapshot } from '../types/crawl-job';
import type { CrawlError } from '../types/errors';
import type { CrawlQueue, EnqueueOptions, JobStore, QueueJobHandle } from '../interfaces/queue';
import { computeBackoffMs, shouldRetry } from './retry-policy';
import type { CrawlerConfig } from '../config/schema';

type QueueEntry = {
  job: CrawlJob;
  attempt: number;
  availableAt: number;
};

export class MemoryJobStore implements JobStore {
  private jobs = new Map<string, CrawlJob>();

  async save(job: CrawlJob): Promise<void> {
    this.jobs.set(job.id, structuredClone(job));
  }

  async load(jobId: string): Promise<CrawlJob | null> {
    const j = this.jobs.get(jobId);
    return j ? structuredClone(j) : null;
  }

  async updateProgress(jobId: string, patch: Partial<CrawlJob['progress']>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.progress = { ...job.progress, ...patch, updatedAt: new Date().toISOString() };
    job.updatedAt = job.progress.updatedAt;
  }

  async appendError(jobId: string, error: CrawlError): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.errors.push(error);
    job.updatedAt = new Date().toISOString();
  }

  async setStatus(jobId: string, status: CrawlJob['status']): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = status;
    job.updatedAt = new Date().toISOString();
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      job.completedAt = job.updatedAt;
    }
  }
}

export class CrawlQueueService implements CrawlQueue {
  private heap: QueueEntry[] = [];
  private deadLetter: CrawlJob[] = [];
  private paused = new Set<string>();
  private cancelled = new Set<string>();

  constructor(
    private readonly store: JobStore,
    private readonly config: CrawlerConfig['queue']
  ) {}

  async enqueue(job: CrawlJob, options?: EnqueueOptions): Promise<void> {
    job.status = 'queued';
    await this.store.save(job);
    const priorityScore = priorityWeight(options?.priority ?? job.priority);
    this.heap.push({
      job,
      attempt: 0,
      availableAt: Date.now() + (options?.delayMs ?? 0),
    });
    this.heap.sort((a, b) => priorityScore - priorityWeight(b.job.priority) || a.availableAt - b.availableAt);
  }

  async dequeue(): Promise<QueueJobHandle | null> {
    const now = Date.now();
    const idx = this.heap.findIndex((e) => e.availableAt <= now && !this.paused.has(e.job.id) && !this.cancelled.has(e.job.id));
    if (idx < 0) return null;
    const [entry] = this.heap.splice(idx, 1);
    entry.attempt += 1;
    await this.store.setStatus(entry.job.id, 'crawling');

    return {
      job: entry.job,
      attempt: entry.attempt,
      ack: async () => {
        await this.store.setStatus(entry.job.id, 'completed');
      },
      nack: async (error, retryable = error.retryable) => {
        await this.store.appendError(entry.job.id, error);
        const max = this.config.maxRetries;
        if (shouldRetry(entry.attempt, max, retryable)) {
          const delay = computeBackoffMs(entry.attempt, this.config.backoffBaseMs, this.config.backoffMaxMs);
          entry.availableAt = Date.now() + delay;
          this.heap.push(entry);
          await this.store.setStatus(entry.job.id, 'queued');
        } else {
          await this.moveToDeadLetter(entry.job.id, error);
        }
      },
    };
  }

  async pause(jobId: string): Promise<boolean> {
    this.paused.add(jobId);
    await this.store.setStatus(jobId, 'paused');
    return true;
  }

  async resume(jobId: string): Promise<boolean> {
    this.paused.delete(jobId);
    await this.store.setStatus(jobId, 'queued');
    return true;
  }

  async cancel(jobId: string): Promise<boolean> {
    this.cancelled.add(jobId);
    this.heap = this.heap.filter((e) => e.job.id !== jobId);
    await this.store.setStatus(jobId, 'cancelled');
    return true;
  }

  async get(jobId: string): Promise<CrawlJob | null> {
    return this.store.load(jobId);
  }

  async list(status?: CrawlJob['status']): Promise<CrawlJobSnapshot[]> {
    const all = [...this.heap.map((e) => e.job)];
    for (const j of this.deadLetter) all.push(j);
    const filtered = status ? all.filter((j) => j.status === status) : all;
    return filtered.map((j) => ({
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
    const job = await this.store.load(jobId);
    if (!job) return;
    job.status = 'failed';
    job.errors.push(error);
    this.deadLetter.push(job);
    await this.store.save(job);
  }

  async length(): Promise<number> {
    return this.heap.length;
  }
}

function priorityWeight(p: CrawlJob['priority']): number {
  switch (p) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    case 'normal':
      return 2;
    default:
      return 3;
  }
}
