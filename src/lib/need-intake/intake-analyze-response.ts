import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';

/** Map intelligence engine output to /api/intake/analyze JSON shape. */
export function formatIntakeAnalyzeResponse(result: IntakeIntelligenceResult) {
  const indexes = buildIntakeIndexesSync();
  const entities = result.draft.entities as Record<string, unknown>;

  return {
    entities: {
      vertical: result.fields.vertical?.value ?? null,
      category: entities.category ?? null,
      categorySlug: result.fields.categorySlug?.value ?? null,
      subcategorySlug: result.fields.subcategorySlug?.value ?? null,
      city: result.fields.city?.value ?? null,
      citySlug: result.fields.citySlug?.value ?? null,
      province: result.fields.province?.value ?? null,
      neighborhood: result.fields.neighborhood?.value ?? null,
      neighborhoodSlug: result.fields.neighborhoodSlug?.value ?? null,
      area: result.fields.area?.value ?? null,
      budgetMin: result.fields.budgetMin?.value ?? null,
      budgetMax: result.fields.budgetMax?.value ?? null,
      rooms: result.fields.rooms?.value ?? null,
      transactionType: result.fields.transactionType?.value ?? null,
    },
    confidence: Object.fromEntries(
      Object.entries(result.trace.fieldMeta).map(([k, v]) => [k, v.confidence]),
    ),
    fieldMeta: result.trace.fieldMeta,
    parseGaps: result.gaps,
    templateId: result.draft.templateId,
    templateVersion: result.draft.templateVersion,
    rootSlug: String(result.fields.vertical?.value ?? 'general'),
    categoryPath: [result.fields.categorySlug?.value, result.fields.subcategorySlug?.value].filter(
      Boolean,
    ),
    detectedVertical: result.fields.vertical?.value ?? null,
    detectedCategory: result.fields.subcategorySlug?.value ?? null,
    missingFields: result.missingFields,
    recommendedQuestions: result.recommendedQuestions,
    suggestedFilters: result.suggestedFilters ?? [],
    categoryCandidates:
      result.categoryCandidates ??
      result.parsedIntent?.categoryCandidates ??
      result.draft.parsedIntent.categoryCandidates,
    cityCandidates: result.draft.parsedIntent.cityCandidates,
    completionScore: result.draft.completionScore,
    matchabilityScore: result.draft.matchabilityScore,
    completionState: result.draft.completionState,
    sections: result.draft.sections,
    nextQuestion: result.nextQuestion,
    normalizedText: result.trace.normalizedText,
    latencyMs: result.meta.latencyMs,
    draft: result.draft,
    meta: {
      engine: result.meta.engine,
      aiInvoked: result.meta.aiInvoked,
      truthVerifyCorrected: result.meta.truthVerifyCorrected ?? [],
      traceId: result.trace.traceId,
      truthVerification: result.trace.truthVerification,
      intentGist: result.trace.intentGist ?? null,
      intentGistProvider: result.trace.intentGistProvider ?? null,
      indexStats: {
        categories: indexes.categories.size,
        cities: indexes.cities.size,
        neighborhoods: indexes.neighborhoods.size,
      },
    },
  };
}
