import type { IntakeIndexes } from '@/intake/types';
import type { IntakeAnalysisResult } from '@/intake/types';
import type { AiCandidateRetrievalSet } from '@/ai/types';
import {
  retrieveIntakeCandidates,
  toLegacyCandidates,
} from '@/ai/services/candidateRetrieval';

/** @deprecated Use retrieveIntakeCandidates */
export function buildIntakeCandidates(
  indexes: IntakeIndexes,
  tokens: readonly string[],
  ngrams: readonly string[],
  preferredCityId?: string | null,
  ruleResult?: IntakeAnalysisResult
): AiCandidateRetrievalSet {
  if (ruleResult) {
    return retrieveIntakeCandidates(indexes, tokens, ngrams, ruleResult);
  }

  const stub: IntakeAnalysisResult = {
    entities: {
      vertical: null,
      category: null,
      categorySlug: null,
      subcategorySlug: null,
      city: null,
      citySlug: preferredCityId ?? null,
      province: null,
      neighborhood: null,
      neighborhoodSlug: null,
      area: null,
      budgetMin: null,
      budgetMax: null,
      rooms: null,
      transactionType: null,
      lat: null,
      lng: null,
    },
    confidence: {},
    templateId: 'general',
    templateVersion: 1,
    rootSlug: 'general',
    categoryPath: ['general'],
    detectedVertical: null,
    detectedCategory: null,
    missingFields: [],
    nextQuestion: null,
    recommendedQuestions: [],
    completionScore: 0,
    matchabilityScore: 0,
    completionState: 'VERY_INCOMPLETE',
    sections: [],
    normalizedText: '',
    latencyMs: 0,
  };

  if (preferredCityId) {
    const city = [...indexes.cities.values()].find((c) => c.id === preferredCityId);
    if (city) {
      stub.entities.citySlug = city.slug;
      stub.entities.city = city.name;
    }
  }

  return retrieveIntakeCandidates(indexes, tokens, ngrams, stub);
}

export { toLegacyCandidates };
