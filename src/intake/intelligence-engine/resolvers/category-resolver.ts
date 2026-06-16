import { rulesCategoryToFieldBag } from '@/intake/rules/resolver/rules-category-resolver';
import type { IntakeFieldBag, IntakeIntelligenceInput } from '@/intake/intelligence-engine/types';

export function resolveCategory(
  sourceText: string,
  input: IntakeIntelligenceInput
): Partial<IntakeFieldBag> {
  return rulesCategoryToFieldBag(sourceText, input);
}
