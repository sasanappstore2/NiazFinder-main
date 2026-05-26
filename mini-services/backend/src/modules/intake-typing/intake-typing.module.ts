import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntakeTypingGateway } from './intake-typing.gateway';
import { IntakeTypingService } from './intake-typing.service';
import { IntakeTypingController } from './intake-typing.controller';
import { IntakeHeavyProcessor } from '../../common/processors/intake-heavy.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'intake-heavy' })],
  controllers: [IntakeTypingController],
  providers: [IntakeTypingGateway, IntakeTypingService, IntakeHeavyProcessor],
  exports: [IntakeTypingService],
})
export class IntakeTypingModule {}
