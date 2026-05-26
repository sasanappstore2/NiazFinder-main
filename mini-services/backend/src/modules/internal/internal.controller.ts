import { Body, Controller, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('internal')
export class InternalController {
  constructor(
    @InjectQueue('request-moderation') private readonly moderationQueue: Queue,
  ) {}

  @Post('enqueue-request-moderation')
  async enqueueRequestModeration(@Body() body: { requestId?: string }) {
    if (!body?.requestId) {
      return { ok: false, error: 'requestId required' };
    }
    await this.moderationQueue.add(
      'moderate',
      { requestId: body.requestId },
      { removeOnComplete: true },
    );
    return { ok: true };
  }
}
