import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntakeIntelligenceService } from './intake-intelligence.service';
import { IntakeIntelligenceController } from './intake-intelligence.controller';

/** Delegates async intake analyze jobs to Next.js internal execute route. */
@Module({
  imports: [ConfigModule],
  controllers: [IntakeIntelligenceController],
  providers: [IntakeIntelligenceService],
  exports: [IntakeIntelligenceService],
})
export class IntakeIntelligenceModule {}
