import { normalizeCategoryPair, getCategoryPath } from '@/config/categories';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import {
  RULES_DISAMBIG_MIN_CONFIDENCE,
  RULES_DISAMBIG_MIN_GAP,
  RULES_DISAMBIG_NEAR_TOP_RATIO,
  RULES_DISAMBIG_TOP_K,
} from '@/intake/rules/config';
import {
  extractFieldsFromRules,
  scoreRulesAgainstText,
} from '@/intake/rules/matcher/category-matcher';
import type {
  CategoryMatchCandidate,
  CategoryMatchResult,
  IntakeRule,
} from '@/intake/rules/types';

/** True when `maybeAncestor` is on the taxonomy path of `leaf` (parent/section). */
function isCategoryAncestor(maybeAncestor: string, leaf: string): boolean {
  if (!maybeAncestor || !leaf || maybeAncestor === leaf) return false;
  return getCategoryPath(leaf).some((c) => c.slug === maybeAncestor);
}
export function candidateToCategoryMatchResult(
  text: string,
  candidate: CategoryMatchCandidate,
  positiveRules: IntakeRule[]
): CategoryMatchResult {
  const normalized = normalizeIntakeText(text);
  const pair = normalizeCategoryPair(candidate.slug);
  const matchedPositive = positiveRules.filter(
    (r) => candidate.matchedRules.includes(r.id) && r.kind !== 'negative'
  );
  const extracted = extractFieldsFromRules(normalized, matchedPositive);

  return {
    categorySlug: pair.categorySlug,
    subcategorySlug: pair.subcategorySlug,
    confidence: candidate.confidence,
    score: candidate.score,
    matchedRules: candidate.matchedRules,
    brand: extracted.brand,
    model: extracted.model,
    condition: extracted.condition,
    titleSubject: extracted.titleSubject,
  };
}

export function matchCategoryCandidatesFromRuleSet(
  text: string,
  positiveRules: IntakeRule[],
  negativeRules: IntakeRule[],
  opts?: { limit?: number }
): CategoryMatchCandidate[] {
  const normalized = normalizeIntakeText(text);
  if (!normalized) return [];

  const limit = opts?.limit ?? RULES_DISAMBIG_TOP_K;
  const candidates = scoreRulesAgainstText(normalized, positiveRules, negativeRules);
  return candidates.filter((c) => c.confidence >= 0.5).slice(0, limit);
}

export function isCategoryAmbiguous(candidates: CategoryMatchCandidate[]): boolean {
  if (candidates.length < 2) return false;

  const top = candidates[0]!;
  // Parent/section scores next to a clear leaf are not real collisions
  // (e.g. apartment-sale @0.98 vs real-estate @0.89).
  const rivals = candidates.filter(
    (c) => c.slug !== top.slug && !isCategoryAncestor(c.slug, top.slug)
  );
  if (rivals.length === 0) return false;
  const second = rivals[0]!;

  if (top.confidence >= RULES_DISAMBIG_MIN_CONFIDENCE) {
    const gap = top.confidence - second.confidence;
    if (gap >= RULES_DISAMBIG_MIN_GAP) return false;
  }

  const maxScore = Math.max(1, top.score);
  const nearTop = [top, ...rivals].filter(
    (c) => c.score >= maxScore * RULES_DISAMBIG_NEAR_TOP_RATIO
  );
  return nearTop.length >= 2;
}

export function pickCategoryIfClear(
  text: string,
  candidates: CategoryMatchCandidate[],
  positiveRules: IntakeRule[]
): CategoryMatchResult | null {
  const top = candidates[0];
  if (!top || top.confidence < 0.5) return null;
  if (isCategoryAmbiguous(candidates)) return null;

  return candidateToCategoryMatchResult(text, top, positiveRules);
}

export function matchCategoryFromRuleSet(
  text: string,
  positiveRules: IntakeRule[],
  negativeRules: IntakeRule[]
): CategoryMatchResult | null {
  const candidates = matchCategoryCandidatesFromRuleSet(text, positiveRules, negativeRules, {
    limit: 1,
  });
  const top = candidates[0];
  if (!top || top.confidence < 0.5) return null;

  return candidateToCategoryMatchResult(text, top, positiveRules);
}
