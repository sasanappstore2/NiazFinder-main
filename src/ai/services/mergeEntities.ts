import type { IntakeEntities } from '@/intake/types';

/**
 * Merge AI patch into rule-based entities.
 * Rule engine always wins — AI only fills missing fields.
 */
export function mergeRuleAndAiEntities(
  ruleEntities: IntakeEntities,
  aiPatch: Partial<IntakeEntities>
): IntakeEntities {
  const merged: IntakeEntities = { ...ruleEntities };

  const fillIfMissing = <K extends keyof IntakeEntities>(key: K) => {
    const current = merged[key];
    const incoming = aiPatch[key];
    if (
      (current === null || current === undefined || current === '') &&
      incoming !== null &&
      incoming !== undefined &&
      incoming !== ''
    ) {
      merged[key] = incoming as IntakeEntities[K];
    }
  };

  fillIfMissing('vertical');
  fillIfMissing('category');
  fillIfMissing('categorySlug');
  fillIfMissing('subcategorySlug');
  fillIfMissing('city');
  fillIfMissing('citySlug');
  fillIfMissing('province');
  fillIfMissing('neighborhood');
  fillIfMissing('neighborhoodSlug');
  fillIfMissing('area');
  fillIfMissing('budgetMin');
  fillIfMissing('budgetMax');
  fillIfMissing('rooms');
  fillIfMissing('transactionType');

  return merged;
}
