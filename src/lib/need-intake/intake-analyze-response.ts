import type { IntakeIntelligenceResult } from '@/intake/intelligence-engine/types';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { getIntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import { buildIntakeAgentResult } from '@/intake/agent/build-agent-result';
import { resolveRequiredFields } from '@/intake/template/required-field-resolver';

/** Map intelligence engine output to /api/intake/analyze JSON shape. */
export function formatIntakeAnalyzeResponse(result: IntakeIntelligenceResult) {
  const indexes = buildIntakeIndexesSync();
  const entities = result.draft.entities as Record<string, unknown>;
  const analysisMode = getIntakeAnalysisMode();
  const agent = buildIntakeAgentResult(result);
  const leaf = String(
    result.fields.subcategorySlug?.value ?? result.fields.categorySlug?.value ?? ''
  );
  const required = resolveRequiredFields({
    categorySlug: leaf,
    answers: result.draft.answers as Record<string, unknown>,
    entities,
    fieldConfidence: Object.fromEntries(
      Object.entries(result.trace.fieldMeta).map(([k, v]) => [k, v.confidence])
    ),
  });
  const canonicalEntities = result.draft.entities as Record<string, unknown>;
  const hasSeparateRentPayment =
    canonicalEntities.rahnAmount != null || canonicalEntities.monthlyRent != null || canonicalEntities.deposit != null;
  const fields = Object.entries(result.trace.fieldMeta)
    .filter(([key]) => !(hasSeparateRentPayment && (key === 'budgetMin' || key === 'budgetMax')))
    .map(([key, state]) => ({
    key,
    value: state.value,
    confidence: state.confidence,
    source:
      state.source === 'ai'
        ? ('llm' as const)
        : state.source === 'rule' || state.source === 'dictionary' || state.source === 'resolver'
          ? ('rules' as const)
    : ('derived' as const),
    requiresConfirmation: state.source === 'ai' || state.confidence < 0.85,
    }));
  const firstCategoryCandidate =
    result.categoryCandidates?.[0] ?? result.parsedIntent?.categoryCandidates?.[0];

  return {
    schemaVersion: 2,
    fields,
    ...(firstCategoryCandidate
      ? {
          provisionalCategory: {
            slug: firstCategoryCandidate.slug,
            confidence: firstCategoryCandidate.confidence,
            reason: firstCategoryCandidate.matchedRules?.join('، '),
          },
        }
      : {}),
    entities: {
      vertical: canonicalEntities.vertical ?? result.fields.vertical?.value ?? null,
      category: entities.category ?? null,
      categorySlug: canonicalEntities.categorySlug ?? result.fields.categorySlug?.value ?? null,
      subcategorySlug:
        canonicalEntities.subcategorySlug ?? result.fields.subcategorySlug?.value ?? null,
      city: canonicalEntities.city ?? result.fields.city?.value ?? null,
      citySlug: canonicalEntities.citySlug ?? result.fields.citySlug?.value ?? null,
      province: result.fields.province?.value ?? null,
      neighborhood: canonicalEntities.neighborhood ?? result.fields.neighborhood?.value ?? null,
      neighborhoodSlug:
        canonicalEntities.neighborhoodSlug ?? result.fields.neighborhoodSlug?.value ?? null,
      area: canonicalEntities.area ?? null,
      budgetMin: canonicalEntities.budgetMin ?? null,
      budgetMax: canonicalEntities.budgetMax ?? null,
      rahnAmount: canonicalEntities.rahnAmount ?? null,
      monthlyRent: canonicalEntities.monthlyRent ?? null,
      deposit: canonicalEntities.deposit ?? null,
      rooms: canonicalEntities.rooms ?? null,
      transactionType: canonicalEntities.transactionType ?? null,
    },
    confidence: Object.fromEntries(
      Object.entries(result.trace.fieldMeta).map(([k, v]) => [k, v.confidence]),
    ),
    fieldMeta: result.trace.fieldMeta,
    parseGaps: result.gaps,
    warnings: agent.warnings,
    templateId: result.draft.templateId,
    templateVersion: result.draft.templateVersion,
    rootSlug: String(canonicalEntities.vertical ?? result.fields.vertical?.value ?? 'general'),
    categoryPath: [canonicalEntities.categorySlug, canonicalEntities.subcategorySlug].filter(Boolean),
    detectedVertical: canonicalEntities.vertical ?? result.fields.vertical?.value ?? null,
    detectedCategory:
      canonicalEntities.subcategorySlug ?? canonicalEntities.categorySlug ?? null,
    missingFields: result.missingFields,
    missingFieldKeys: Array.from(
      new Set([
        ...required.missingFieldKeys,
        ...required.lowConfidenceKeys,
        ...agent.missingFields.map((m) => m.field).filter(Boolean),
      ])
    ),
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
    draftPatch: {
      entities: result.draft.entities,
      draftRevision: result.draft.draftRevision ?? 0,
    },
    agent,
    meta: {
      engine: result.meta.engine,
      analysisMode,
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
