import { Body, Controller, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TypingHeavyJobDto } from './dto/typing-analyze.dto';

@Controller('intake-typing')
export class IntakeTypingController {
  constructor(
    @InjectQueue('intake-heavy') private readonly heavyQueue: Queue,
  ) {}

  @Post('heavy')
  async enqueueHeavy(@Body() body: TypingHeavyJobDto) {
    await this.heavyQueue.add(
      'process',
      {
        requestId: body.requestId,
        sessionId: body.sessionId,
      },
      { removeOnComplete: true },
    );
    return { ok: true };
  }
}
