import { normalizeCategoryPair } from '@/config/categories';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import {
  extractFieldsFromRules,
  scoreRulesAgainstText,
} from '@/intake/rules/matcher/category-matcher';
import type { CategoryMatchResult, IntakeRule } from '@/intake/rules/types';

export function matchCategoryFromRuleSet(
  text: string,
  positiveRules: IntakeRule[],
  negativeRules: IntakeRule[]
): CategoryMatchResult | null {
  const normalized = normalizeIntakeText(text);
  if (!normalized) return null;

  const candidates = scoreRulesAgainstText(normalized, positiveRules, negativeRules);

  const top = candidates[0];
  if (!top || top.confidence < 0.5) return null;

  const pair = normalizeCategoryPair(top.slug);
  const matchedPositive = positiveRules.filter(
    (r) => top.matchedRules.includes(r.id) && r.kind !== 'negative'
  );
  const extracted = extractFieldsFromRules(normalized, matchedPositive);

  return {
    categorySlug: pair.categorySlug,
    subcategorySlug: pair.subcategorySlug,
    confidence: top.confidence,
    score: top.score,
    matchedRules: top.matchedRules,
    brand: extracted.brand,
    model: extracted.model,
    condition: extracted.condition,
    titleSubject: extracted.titleSubject,
  };
}
