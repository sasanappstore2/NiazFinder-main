import type { IntakeFieldBag } from '@/intake/intelligence-engine/types';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';
import { getPackRequiredFields } from '@/intake/rules/pack-intake-manifest';

const FIELD_LABELS_FA: Record<string, string> = {
  city: 'شهر',
  dealType: 'نوع معامله',
  transactionType: 'نوع معامله',
  budget: 'بودجه',
  budgetMax: 'بودجه',
  neighborhoodSlug: 'محله',
  neighborhood: 'محله',
  categorySlug: 'دسته‌بندی',
};

function bagHasField(bag: IntakeFieldBag, key: string): boolean {
  const map: Record<string, keyof IntakeFieldBag> = {
    city: 'city',
    dealType: 'dealType',
    transactionType: 'transactionType',
    budget: 'budgetMax',
    budgetMax: 'budgetMax',
    neighborhoodSlug: 'neighborhoodSlug',
    neighborhood: 'neighborhood',
    categorySlug: 'categorySlug',
  };
  const fieldKey = map[key] ?? (key as keyof IntakeFieldBag);
  const f = bag[fieldKey];
  return f?.value != null && f.value !== '';
}

/** Gaps from pack.meta.requiredFields for the resolved category. */
export function detectPackRequiredGaps(
  bag: IntakeFieldBag,
  categorySlug: string | null | undefined
): IntakeParseGap[] {
  if (!categorySlug) return [];

  const required = getPackRequiredFields(categorySlug);
  const gaps: IntakeParseGap[] = [];

  for (const field of required) {
    if (bagHasField(bag, field)) continue;
    gaps.push({
      id: `missing:pack:${field}`,
      kind: 'missing',
      messageFa: `${FIELD_LABELS_FA[field] ?? field} را مشخص کنید`,
      fieldKey: field,
    });
  }

  return gaps;
}

export function packRequiredFieldKeys(categorySlug: string | null | undefined): string[] {
  if (!categorySlug) return [];
  return getPackRequiredFields(categorySlug);
}
