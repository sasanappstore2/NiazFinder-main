import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IntakeQueueService } from './intake-queue.service';

@Controller('intake-queue')
export class IntakeQueueController {
  constructor(private readonly queue: IntakeQueueService) {}

  @Post('enqueue')
  async enqueue(
    @Body()
    body: {
      jobName?: 'intake.analyze' | 'intake.listing-copy';
      payload?: unknown;
      idempotencyKey?: string;
      paidTier?: boolean;
    },
  ) {
    if (!body?.jobName || !body.payload) {
      return { ok: false, error: 'jobName and payload required' };
    }
    return this.queue.enqueue({
      jobName: body.jobName,
      payload: body.payload,
      idempotencyKey: body.idempotencyKey,
      paidTier: Boolean(body.paidTier),
    });
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return { error: 'not_found' };
    return job;
  }
}
