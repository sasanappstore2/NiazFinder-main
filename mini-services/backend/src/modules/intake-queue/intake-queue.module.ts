import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntakeQueueController } from './intake-queue.controller';
import { IntakeQueueService } from './intake-queue.service';
import { IntakeAnalyzeProcessor } from '../../common/processors/intake-analyze.processor';
import { IntakeListingCopyProcessor } from '../../common/processors/intake-listing-copy.processor';
import { IntakeDeadLetterProcessor } from '../../common/processors/intake-dead-letter.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'intake-analyze' }),
    BullModule.registerQueue({ name: 'intake-listing-copy' }),
    BullModule.registerQueue({ name: 'intake-dead-letter' }),
  ],
  controllers: [IntakeQueueController],
  providers: [
    IntakeQueueService,
    IntakeAnalyzeProcessor,
    IntakeListingCopyProcessor,
    IntakeDeadLetterProcessor,
  ],
  exports: [IntakeQueueService],
})
export class IntakeQueueModule {}
