import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InternalController } from './internal.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'request-moderation' })],
  controllers: [InternalController],
})
export class InternalModule {}
