import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntentParserService } from './intent-parser.service';
import { IntentParserController } from './intent-parser.controller';
import { PersianNormalizerService } from './services/persian-normalizer.service';
import { LocationIndexService } from './services/location-index.service';
import { LocationExtractorService } from './services/location-extractor.service';
import { LLMClassifierEngine } from './engines/llm-classifier.engine';
import { EmbeddingClassifierEngine } from './engines/embedding-classifier.engine';
import { RuleClassifierEngine } from './engines/rule-classifier.engine';
import { ArbitrationEngine } from './engines/arbitration.engine';

@Module({
  imports: [PrismaModule],
  controllers: [IntentParserController],
  providers: [
    IntentParserService,
    PersianNormalizerService,
    LocationIndexService,
    LocationExtractorService,
    LLMClassifierEngine,
    EmbeddingClassifierEngine,
    RuleClassifierEngine,
    ArbitrationEngine,
  ],
  exports: [IntentParserService],
})
export class IntentParserModule {}
