import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersianNormalizerService } from './services/persian-normalizer.service';
import { LocationExtractorService } from './services/location-extractor.service';
import { LLMClassifierEngine } from './engines/llm-classifier.engine';
import { EmbeddingClassifierEngine } from './engines/embedding-classifier.engine';
import { RuleClassifierEngine } from './engines/rule-classifier.engine';
import { ArbitrationEngine } from './engines/arbitration.engine';
import { ParsedIntent } from './types/intent.types';

@Injectable()
export class IntentParserService {
  constructor(
    private prisma: PrismaService,
    private normalizer: PersianNormalizerService,
    private locationExtractor: LocationExtractorService,
    private llm: LLMClassifierEngine,
    private embedding: EmbeddingClassifierEngine,
    private rules: RuleClassifierEngine,
    private arbitration: ArbitrationEngine,
  ) {}

  async parse(rawText: string): Promise<ParsedIntent> {
    const normalized = this.normalizer.normalize(rawText);

    const { result: location, cleanedText } = await this.locationExtractor.extract(normalized);

    const [llmResult, embeddingResult] = await Promise.all([
      this.llm.classify(cleanedText),
      this.embedding.classify(cleanedText),
    ]);
    const ruleResult = this.rules.classify(cleanedText);

    const { top, alternatives, requiresConfirmation } = this.arbitration.aggregate([
      llmResult,
      embeddingResult,
      ruleResult,
    ]);

    const [topCat, altCats] = await Promise.all([
      top.categoryId
        ? this.prisma.category.findUnique({ where: { slug: top.categoryId } })
        : null,
      Promise.all(
        alternatives.map((a) =>
          this.prisma.category.findUnique({ where: { slug: a.categoryId } }),
        ),
      ),
    ]);

    const overallConfidence = top.finalConfidence * 0.6 + location.confidence * 0.4;

    return {
      raw: rawText,
      cleanedText,
      category: {
        id: top.categoryId,
        name: topCat?.name ?? '',
        confidence: top.finalConfidence,
        contributions: top.contributions,
      },
      location,
      overallConfidence,
      requiresConfirmation: requiresConfirmation || overallConfidence < 0.6,
      alternatives: {
        categories: altCats
          .filter(Boolean)
          .map((cat, i) => ({
            id: cat!.slug,
            name: cat!.name,
            confidence: alternatives[i].finalConfidence,
          })),
      },
    };
  }
}
