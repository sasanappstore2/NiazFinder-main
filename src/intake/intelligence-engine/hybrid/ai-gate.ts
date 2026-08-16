import { isIntakeAiGloballyDisabled } from '@/intake/rules/config';
import { isRulesOnlyIntakeMode } from '@/lib/intake/rules-only-mode';
import { extractPropertyMoneyFromText } from '@/lib/need-intake/parse-persian-amount';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
  type IntakeIntelligenceInput,
} from '@/intake/intelligence-engine/types';

/** True when this analyze pass may call an LLM (enrich / forceAi). */
export function isIntakeAiPassRequested(input: IntakeIntelligenceInput): boolean {
  if (isIntakeAiGloballyDisabled() || isRulesOnlyIntakeMode()) return false;
  return Boolean(input.forceAi || input.enrich);
}

/** Same amount assigned to رهن and اجاره — rules cannot tell them apart. */
export function isDuplicateMoneyFieldBag(
  bag: Pick<IntakeFieldBag, 'rahnAmount' | 'monthlyRent'>
): boolean {
  const rahn = bag.rahnAmount?.value;
  const rent = bag.monthlyRent?.value;
  if (rahn == null || rent == null) return false;
  return Number(rahn) === Number(rent) && Number(rahn) > 0;
}

/** When رهن and اجاره collapsed to the same number, re-split from text. */
export function splitDuplicateRahnRent(
  bag: IntakeFieldBag,
  text: string
): Partial<IntakeFieldBag> {
  if (!isDuplicateMoneyFieldBag(bag)) return {};
  const money = extractPropertyMoneyFromText(text);
  if (
    money.rahnAmount == null ||
    money.monthlyRent == null ||
    money.rahnAmount === money.monthlyRent
  ) {
    return {};
  }
  const out = createEmptyFieldBag();
  setField(out, 'rahnAmount', {
    value: money.rahnAmount,
    confidence: 0.88,
    source: 'rule',
    evidence: 'split-duplicate-rahn-rent',
  });
  setField(out, 'monthlyRent', {
    value: money.monthlyRent,
    confidence: 0.88,
    source: 'rule',
    evidence: 'split-duplicate-rahn-rent',
  });
  return out;
}

export function computeNeedsEnrich(opts: {
  alreadyEnriched: boolean;
  categoryAmbiguous: boolean;
  cityUnresolved: boolean;
  duplicateMoney: boolean;
}): boolean {
  if (opts.alreadyEnriched) return false;
  if (isIntakeAiGloballyDisabled() || isRulesOnlyIntakeMode()) return false;
  return opts.categoryAmbiguous || opts.cityUnresolved || opts.duplicateMoney;
}
