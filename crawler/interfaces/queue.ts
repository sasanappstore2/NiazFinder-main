import type { CrawlJob, CrawlJobSnapshot } from '../types/crawl-job';
import type { CrawlError } from '../types/errors';

export type EnqueueOptions = {
  priority?: CrawlJob['priority'];
  delayMs?: number;
  maxAttempts?: number;
};

export type QueueJobHandle = {
  job: CrawlJob;
  attempt: number;
  ack(): Promise<void>;
  nack(error: CrawlError, retryable?: boolean): Promise<void>;
};

export interface CrawlQueue {
  enqueue(job: CrawlJob, options?: EnqueueOptions): Promise<void>;
  dequeue(): Promise<QueueJobHandle | null>;
  pause(jobId: string): Promise<boolean>;
  resume(jobId: string): Promise<boolean>;
  cancel(jobId: string): Promise<boolean>;
  get(jobId: string): Promise<CrawlJob | null>;
  list(status?: CrawlJob['status']): Promise<CrawlJobSnapshot[]>;
  moveToDeadLetter(jobId: string, error: CrawlError): Promise<void>;
  length(): Promise<number>;
}

export interface JobStore {
  save(job: CrawlJob): Promise<void>;
  load(jobId: string): Promise<CrawlJob | null>;
  updateProgress(jobId: string, patch: Partial<CrawlJob['progress']>): Promise<void>;
  appendError(jobId: string, error: CrawlError): Promise<void>;
  setStatus(jobId: string, status: CrawlJob['status']): Promise<void>;
}
