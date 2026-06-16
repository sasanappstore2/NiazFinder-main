import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';
import { extractPropertyMoneyFromText } from '@/lib/need-intake/parse-persian-amount';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
} from '@/intake/intelligence-engine/types';

export function resolveBudget(rawText: string): Partial<IntakeFieldBag> {
  const bag = createEmptyFieldBag();
  const money = extractPropertyMoneyFromText(applyTypoAliases(rawText));

  if (money.rahnAmount != null) {
    setField(bag, 'rahnAmount', {
      value: money.rahnAmount,
      confidence: 0.9,
      source: 'rule',
      evidence: 'extractPropertyMoneyFromText:rahn',
    });
  }
  if (money.monthlyRent != null) {
    setField(bag, 'monthlyRent', {
      value: money.monthlyRent,
      confidence: 0.9,
      source: 'rule',
      evidence: 'extractPropertyMoneyFromText:rent',
    });
  }
  if (money.deposit != null) {
    setField(bag, 'deposit', {
      value: money.deposit,
      confidence: 0.85,
      source: 'rule',
    });
  }
  if (money.budgetMax != null) {
    setField(bag, 'budgetMax', {
      value: money.budgetMax,
      confidence: 0.85,
      source: 'rule',
      evidence: 'budget',
    });
  }

  return bag;
}
