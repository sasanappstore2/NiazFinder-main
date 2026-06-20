import { REGISTRY_CATEGORY_OVERRIDE_THRESHOLD } from '@/intake/rules/config';
import { matchCategoryFromRules } from '@/intake/rules/registry.server';
import type { CategoryMatchResult } from '@/intake/rules/types';
import type { IntentSliceResult } from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';

export const HYBRID_FAST_PATH_CONFIDENCE = REGISTRY_CATEGORY_OVERRIDE_THRESHOLD;

export function matchCategoryFastPath(text: string): CategoryMatchResult | null {
  const result = matchCategoryFromRules(text);
  if (result && result.confidence >= HYBRID_FAST_PATH_CONFIDENCE) {
    return result;
  }
  return result;
}

export function shouldSkipIntentSlice(fastPath: CategoryMatchResult | null): boolean {
  return Boolean(fastPath && fastPath.confidence >= HYBRID_FAST_PATH_CONFIDENCE);
}

export function matchCategoryScoped(
  text: string,
  intentSlice: IntentSliceResult | null
): CategoryMatchResult | null {
  const verticalFilter: ClassifierVertical[] = intentSlice
    ? [intentSlice.vertical]
    : [];

  return matchCategoryFromRules(text, {
    verticalFilter: verticalFilter.length ? verticalFilter : undefined,
    slugHints: intentSlice?.keywords,
  });
}
