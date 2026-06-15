import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface DeadLetterJob {
  jobId: string;
  jobName: string;
  payload: unknown;
  error: string;
}

/** Phase 46.6 ? dead letter queue audit sink. */
@Processor('intake-dead-letter')
export class IntakeDeadLetterProcessor extends WorkerHost {
  private readonly logger = new Logger(IntakeDeadLetterProcessor.name);

  async process(job: Job<DeadLetterJob>): Promise<void> {
    this.logger.error(
      `DLQ intake job jobId=${job.data.jobId} name=${job.data.jobName} error=${job.data.error}`,
    );
  }
}
