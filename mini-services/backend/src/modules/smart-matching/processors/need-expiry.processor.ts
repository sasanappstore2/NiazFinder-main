import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NeedVisibilityService } from '../services/need-visibility.service';

@Processor('need-expiry')
export class NeedExpiryProcessor extends WorkerHost {
  constructor(private readonly visibility: NeedVisibilityService) {
    super();
  }

  async process(job: Job<{ requestId: string }>) {
    return this.visibility.flipNeedToPublic(job.data.requestId);
  }
}
