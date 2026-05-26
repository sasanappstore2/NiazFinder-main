import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

interface RequestModerationJob {
  requestId: string;
}

/**
 * Phase 2: delegates auto-moderation rules to Next.js internal API.
 */
@Processor('request-moderation')
export class RequestModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(RequestModerationProcessor.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async process(job: Job<RequestModerationJob>): Promise<void> {
    const { requestId } = job.data;
    const origin =
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:3000';
    const secret = this.config.get<string>('INTERNAL_API_SECRET');

    try {
      const res = await fetch(`${origin}/api/internal/request-moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-internal-secret': secret } : {}),
        },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json().catch(() => ({}));
      this.logger.log(
        `request-moderation job ${job.id} requestId=${requestId} result=${JSON.stringify(data)}`,
      );
    } catch (err) {
      this.logger.error(`request-moderation failed for ${requestId}`, err);
      throw err;
    }
  }
}
