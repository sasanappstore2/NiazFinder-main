import { resolveTransactionType, resolveLegacyDealType } from '@/lib/need-intake/resolve-transaction-type';
import { getCategoryPath } from '@/config/categories';
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
  const leafSlug = subcategorySlug || categorySlug;
  const rootSlug = getCategoryPath(leafSlug)[0]?.slug ?? categorySlug;

  // «فروش» in a job title (کارشناس فروش) and «دنبال» in a job request are
  // not marketplace transactions. Keep transaction fields empty for domains
  // where the user is seeking a person/service rather than an asset.
  if (rootSlug === 'jobs' || rootSlug === 'services') return {};

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

/** Remove stale legacy transaction guesses after all rule/AI merges. */
export function clearNonAssetTransactionFields(bag: IntakeFieldBag): void {
  const categorySlug = String(bag.categorySlug?.value ?? '');
  const subcategorySlug = String(bag.subcategorySlug?.value ?? '');
  const rootSlug = getCategoryPath(subcategorySlug || categorySlug)[0]?.slug ?? categorySlug;
  if (rootSlug === 'jobs' || rootSlug === 'services') {
    Reflect.deleteProperty(bag, 'transactionType');
    Reflect.deleteProperty(bag, 'dealType');
  }
}
