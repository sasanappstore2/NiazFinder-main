import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface IntakeHeavyJob {
  requestId: string;
  sessionId?: string;
}

/**
 * Heavy async enrichment after need publish (matching, analytics, future embeddings).
 */
@Processor('intake-heavy')
export class IntakeHeavyProcessor extends WorkerHost {
  private readonly logger = new Logger(IntakeHeavyProcessor.name);

  async process(job: Job<IntakeHeavyJob>): Promise<void> {
    const { requestId, sessionId } = job.data;
    this.logger.log(
      `intake-heavy job ${job.id} requestId=${requestId} session=${sessionId ?? 'n/a'}`,
    );
    // Phase 3: call Next enrich/match APIs, store analytics row, embeddings.
    await new Promise((r) => setTimeout(r, 50));
  }
}
