import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { IntakeQueueService } from '../../modules/intake-queue/intake-queue.service';

interface IntakeListingCopyQueueJob {
  jobId: string;
  jobName: 'intake.listing-copy';
  payload: { draft: Record<string, unknown>; extras?: string[] };
  idempotencyKey: string;
}

@Processor('intake-listing-copy')
export class IntakeListingCopyProcessor extends WorkerHost {
  private readonly logger = new Logger(IntakeListingCopyProcessor.name);

  constructor(
    private readonly config: ConfigService,
    private readonly queueService: IntakeQueueService,
  ) {
    super();
  }

  async process(job: Job<IntakeListingCopyQueueJob>): Promise<void> {
    const { jobId, payload } = job.data;
    await this.queueService.markActive(jobId);

    const origin =
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:3000';
    const secret = this.config.get<string>('INTERNAL_API_SECRET');

    const res = await fetch(`${origin}/api/internal/intake-queue/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-internal-secret': secret } : {}),
      },
      body: JSON.stringify({ jobName: 'intake.listing-copy', payload }),
    });

    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; error?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? `listing-copy execute HTTP ${res.status}`);
    }

    await this.queueService.markCompleted(jobId, data.result);
    this.logger.log(`intake.listing-copy completed jobId=${jobId}`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<IntakeListingCopyQueueJob>, error: Error): Promise<void> {
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= attempts) {
      await this.queueService.moveToDeadLetter({
        jobId: job.data.jobId,
        jobName: 'intake.listing-copy',
        payload: job.data.payload,
        error: error.message,
      });
    } else {
      await this.queueService.markFailed(job.data.jobId, error.message, false);
    }
  }
}
