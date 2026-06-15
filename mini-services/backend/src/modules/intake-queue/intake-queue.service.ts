import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { RedisService } from '../../common/redis/redis.service';

export type IntakeQueueJobName = 'intake.analyze' | 'intake.listing-copy';

export interface IntakeQueueJobRecord {
  jobId: string;
  jobName: IntakeQueueJobName;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'dead_letter';
  idempotencyKey: string;
  priority: number;
  createdAt: number;
  updatedAt: number;
  result?: unknown;
  error?: string;
}

const JOB_KEY_PREFIX = 'intake:job:';
const IDEM_KEY_PREFIX = 'intake:idempotency:';
const JOB_TTL_SEC = 30 * 60;

@Injectable()
export class IntakeQueueService {
  private readonly logger = new Logger(IntakeQueueService.name);

  constructor(
    @InjectQueue('intake-analyze') private readonly analyzeQueue: Queue,
    @InjectQueue('intake-listing-copy') private readonly listingQueue: Queue,
    @InjectQueue('intake-dead-letter') private readonly deadLetterQueue: Queue,
    private readonly redis: RedisService,
  ) {}

  buildIdempotencyKey(jobName: string, payload: unknown, clientKey?: string): string {
    const raw = JSON.stringify({ jobName, payload, clientKey: clientKey?.trim() || '' });
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  private jobKey(jobId: string): string {
    return `${JOB_KEY_PREFIX}${jobId}`;
  }

  private idemKey(key: string): string {
    return `${IDEM_KEY_PREFIX}${key}`;
  }

  async getJob(jobId: string): Promise<IntakeQueueJobRecord | null> {
    const raw = await this.redis.get(this.jobKey(jobId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as IntakeQueueJobRecord;
    } catch {
      return null;
    }
  }

  async saveJob(record: IntakeQueueJobRecord): Promise<void> {
    await this.redis.set(this.jobKey(record.jobId), JSON.stringify(record), JOB_TTL_SEC);
  }

  async lookupIdempotent(idempotencyKey: string): Promise<string | null> {
    return this.redis.get(this.idemKey(idempotencyKey));
  }

  async rememberIdempotent(idempotencyKey: string, jobId: string): Promise<void> {
    await this.redis.set(this.idemKey(idempotencyKey), jobId, JOB_TTL_SEC);
  }

  async enqueue(input: {
    jobName: IntakeQueueJobName;
    payload: unknown;
    idempotencyKey?: string;
    paidTier?: boolean;
  }): Promise<{ ok: boolean; jobId?: string; idempotencyKey?: string; error?: string }> {
    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      this.buildIdempotencyKey(input.jobName, input.payload);

    const existing = await this.lookupIdempotent(idempotencyKey);
    if (existing) {
      return { ok: true, jobId: existing, idempotencyKey };
    }

    const jobId = randomUUID();
    const priority = input.paidTier ? 1 : 5;
    const now = Date.now();

    const record: IntakeQueueJobRecord = {
      jobId,
      jobName: input.jobName,
      status: 'queued',
      idempotencyKey,
      priority,
      createdAt: now,
      updatedAt: now,
    };
    await this.saveJob(record);
    await this.rememberIdempotent(idempotencyKey, jobId);

    const queue = input.jobName === 'intake.analyze' ? this.analyzeQueue : this.listingQueue;
    await queue.add(
      input.jobName,
      { jobId, jobName: input.jobName, payload: input.payload, idempotencyKey },
      { jobId, priority, removeOnComplete: true },
    );

    this.logger.log(`enqueued ${input.jobName} jobId=${jobId} priority=${priority}`);
    return { ok: true, jobId, idempotencyKey };
  }

  async markActive(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    await this.saveJob({ ...job, status: 'active', updatedAt: Date.now() });
  }

  async markCompleted(jobId: string, result: unknown): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    await this.saveJob({
      ...job,
      status: 'completed',
      result,
      updatedAt: Date.now(),
    });
  }

  async markFailed(jobId: string, error: string, deadLetter = false): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    await this.saveJob({
      ...job,
      status: deadLetter ? 'dead_letter' : 'failed',
      error,
      updatedAt: Date.now(),
    });
  }

  async moveToDeadLetter(data: {
    jobId: string;
    jobName: IntakeQueueJobName;
    payload: unknown;
    error: string;
  }): Promise<void> {
    await this.deadLetterQueue.add(
      'dead-letter',
      data,
      { removeOnComplete: { count: 200 } },
    );
    await this.markFailed(data.jobId, data.error, true);
    this.logger.warn(`dead-letter jobId=${data.jobId} jobName=${data.jobName}`);
  }
}
