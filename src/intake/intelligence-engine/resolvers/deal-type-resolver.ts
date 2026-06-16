import { resolveTransactionType, resolveLegacyDealType } from '@/lib/need-intake/resolve-transaction-type';
import type { TransactionType } from '@/intake/types';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
} from '@/intake/intelligence-engine/types';

export function resolveDealTypeFields(
  rawText: string,
  bag: IntakeFieldBag
): Partial<IntakeFieldBag> {
  const categorySlug = String(bag.categorySlug?.value ?? 'real-estate');
  const subcategorySlug = String(bag.subcategorySlug?.value ?? '');

  const tx = resolveTransactionType({
    sourceText: rawText,
    categorySlug,
    subcategorySlug: subcategorySlug || undefined,
  });

  if (!tx) return {};

  const dealType = resolveLegacyDealType(undefined, tx);
  const out = createEmptyFieldBag();

  setField(out, 'transactionType', {
    value: tx as TransactionType,
    confidence: 0.88,
    source: 'rule',
    evidence: 'resolveTransactionType',
  });
  if (dealType) {
    setField(out, 'dealType', {
      value: dealType,
      confidence: 0.88,
      source: 'rule',
    });
  }

  return out;
}
