import type { AiProvider } from '@/ai/providers/base';
import type { ResolveIntakeInput, ResolveIntakeResult } from '@/ai/types';
import { safeParseConstrainedSelection } from '@/ai/schema/extractionSchema';
import {
  toAiExtractionRaw,
  validateConstrainedSelection,
} from '@/ai/schema/validationSchema';
import { computeCombinedConfidence } from '@/ai/services/candidateConfidence';

export interface MockProviderOptions {
  response?: string;
  delayMs?: number;
  shouldFail?: boolean;
}

export class MockAiProvider implements AiProvider {
  readonly name = 'mock' as const;

  constructor(private readonly options: MockProviderOptions = {}) {}

  async resolveIntake(input: ResolveIntakeInput): Promise<ResolveIntakeResult> {
    const started = performance.now();
    if (this.options.delayMs) {
      await new Promise((r) => setTimeout(r, this.options.delayMs));
    }

    if (this.options.shouldFail) {
      return {
        ok: false,
        provider: 'mock',
        extraction: null,
        validatedEntities: null,
        error: {
          code: 'UNAVAILABLE',
          message: 'Mock provider failure',
          retryable: false,
        },
        latencyMs: Math.round(performance.now() - started),
      };
    }

    const catSlug = input.candidates.categories[0]?.slug ?? null;
    const citySlug = input.candidates.cities[0]?.slug ?? null;
    const neighborhoodSlug = input.candidates.neighborhoods[0]?.slug ?? null;

    const raw =
      this.options.response ??
      JSON.stringify({
        category: catSlug,
        city: citySlug,
        neighborhood: neighborhoodSlug,
        transactionType: input.candidates.transactionTypes[0]?.value ?? 'RENT',
        budget: null,
        area: 180,
        rooms: null,
        confidence: 0.9,
      });

    const parsed = safeParseConstrainedSelection(raw);
    if (!parsed) {
      return {
        ok: false,
        provider: 'mock',
        extraction: null,
        validatedEntities: null,
        error: { code: 'PARSE_ERROR', message: 'Mock JSON invalid', retryable: false },
        latencyMs: Math.round(performance.now() - started),
        rawResponse: raw,
      };
    }

    const extraction = toAiExtractionRaw(parsed);
    const validation = validateConstrainedSelection(parsed, input.candidates);
    const fieldConfidence = computeCombinedConfidence(
      extraction,
      input.candidates,
      input.ruleResult.confidence,
      validation.acceptedSlugs
    );

    return {
      ok: Object.keys(validation.patch).length > 0,
      provider: 'mock',
      extraction,
      validatedEntities: validation.patch,
      validationRejects: validation.rejects,
      fieldConfidence,
      error: null,
      latencyMs: Math.round(performance.now() - started),
      rawResponse: raw,
    };
  }
}
