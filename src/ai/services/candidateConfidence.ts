import type { AiCandidateRetrievalSet } from '@/ai/types';
import type { IntakeConfidence } from '@/intake/types';
import type { AiExtractionRaw } from '@/ai/types';
import { clampConfidence } from '@/intake/scoring/confidenceEngine';

export interface CombinedFieldConfidence {
  category: number;
  city: number;
  neighborhood: number;
  transactionType: number;
  overall: number;
}

const RULE_WEIGHT = 0.4;
const RANK_WEIGHT = 0.35;
const AI_WEIGHT = 0.25;

function rankScoreForCategory(slug: string | null, candidates: AiCandidateRetrievalSet): number {
  if (!slug) return 0;
  return candidates.categories.find((c) => c.slug === slug)?.rankScore ?? 0;
}

function rankScoreForCity(slug: string | null, candidates: AiCandidateRetrievalSet): number {
  if (!slug) return 0;
  return candidates.cities.find((c) => c.slug === slug)?.rankScore ?? 0;
}

function rankScoreForNeighborhood(slug: string | null, candidates: AiCandidateRetrievalSet): number {
  if (!slug) return 0;
  return candidates.neighborhoods.find((n) => n.slug === slug)?.rankScore ?? 0;
}

function combine(
  rule: number | undefined,
  rank: number,
  ai: number
): number {
  return clampConfidence(
    (rule ?? 0) * RULE_WEIGHT + rank * RANK_WEIGHT + ai * AI_WEIGHT
  );
}

/**
 * Combine rule confidence, candidate ranking, and model-reported confidence.
 * Does not trust model confidence alone.
 */
export function computeCombinedConfidence(
  extraction: AiExtractionRaw | null,
  candidates: AiCandidateRetrievalSet,
  ruleConfidence: IntakeConfidence,
  validatedFields: {
    categorySlug?: string | null;
    citySlug?: string | null;
    neighborhoodSlug?: string | null;
    transactionType?: string | null;
  }
): CombinedFieldConfidence {
  const aiBase = extraction?.confidence ?? 0;

  const category = combine(
    ruleConfidence.category,
    rankScoreForCategory(validatedFields.categorySlug ?? extraction?.category ?? null, candidates),
    validatedFields.categorySlug ? aiBase : 0
  );
  const city = combine(
    ruleConfidence.city,
    rankScoreForCity(validatedFields.citySlug ?? extraction?.city ?? null, candidates),
    validatedFields.citySlug ? aiBase : 0
  );
  const neighborhood = combine(
    ruleConfidence.neighborhood,
    rankScoreForNeighborhood(
      validatedFields.neighborhoodSlug ?? extraction?.neighborhood ?? null,
      candidates
    ),
    validatedFields.neighborhoodSlug ? aiBase : 0
  );
  const transactionType = combine(
    ruleConfidence.transactionType,
    extraction?.transactionType ? 0.7 : 0,
    validatedFields.transactionType ? aiBase : 0
  );

  const parts = [category, city, neighborhood, transactionType].filter((v) => v > 0);
  const overall =
    parts.length > 0
      ? clampConfidence(parts.reduce((a, b) => a + b, 0) / parts.length)
      : aiBase;

  return { category, city, neighborhood, transactionType, overall };
}
