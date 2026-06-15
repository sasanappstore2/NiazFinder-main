import type { ParsedIntent } from '@/contracts/need-intake';
import { normalizeCategoryPair } from '@/config/categories';
import { applyVerticalChipSelection } from '@/lib/need-intake/parse-assistant';
import { getClarifyingChipSet } from '@/lib/need-intake/clarifying-chips';
import { classifyVertical } from '@/lib/need-intake/vertical-classifier';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';

export interface ClarifyingChipApplyResult {
  entityPatch: Record<string, unknown>;
  answerPatch: Record<string, unknown>;
  parsedPatch?: Partial<ParsedIntent>;
  navigateToNeed?: boolean;
}

/** Map clarifying chip value to draft patches (wizard refine). */
export function applyClarifyingChipSelection(
  chipValue: string,
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): ClarifyingChipApplyResult | null {
  if (chipValue === 'change') {
    return { entityPatch: {}, answerPatch: {}, navigateToNeed: true };
  }
  if (chipValue === 'confirm') {
    return { entityPatch: {}, answerPatch: {} };
  }

  if (chipValue.startsWith('vertical:')) {
    const next = applyVerticalChipSelection(parsed, chipValue);
    const pair = normalizeCategoryPair(next.categorySlug);
    const entityPatch: Record<string, unknown> = {
      categorySlug: pair.categorySlug,
      subcategorySlug: pair.subcategorySlug ?? null,
      category: pair.categorySlug,
      subcategory: pair.subcategorySlug ?? null,
    };
    if (next.entities?.dealType) {
      entityPatch.dealType = next.entities.dealType;
      entityPatch.transactionType = mapDealTypeToTransaction(next.entities.dealType);
    }
    if (next.entities?.propertyKind) {
      entityPatch.propertyKind = next.entities.propertyKind;
    }
    const answerPatch: Record<string, unknown> = {};
    if (next.entities?.dealType) {
      answerPatch.dealType = next.entities.dealType;
      answerPatch._userSetDealType = true;
    }
    return { entityPatch, answerPatch, parsedPatch: next };
  }

  const clarifying = getClarifyingChipSet(parsed, answers, classifyVertical(parsed.rawText));
  if (!clarifying) return null;

  const answerPatch: Record<string, unknown> = {
    [clarifying.fieldKey]: chipValue,
  };
  const entityPatch: Record<string, unknown> = {};

  if (clarifying.fieldKey === 'dealType') {
    entityPatch.dealType = chipValue;
    entityPatch.transactionType = mapDealTypeToTransaction(chipValue);
    answerPatch._userSetDealType = true;
  }

  return { entityPatch, answerPatch };
}
