import type { IntakeFieldBag, IntakeFieldKey } from '@/intake/intelligence-engine/types';

const MONEY_FIELDS: IntakeFieldKey[] = [
  'rahnAmount',
  'monthlyRent',
  'deposit',
  'budgetMax',
  'budgetMin',
];

const LOCATION_FIELDS: IntakeFieldKey[] = [
  'city',
  'citySlug',
  'neighborhood',
  'neighborhoodSlug',
];

const MAX_FIELDS_PER_VERIFY = 10;

/** Decide which fields the AI must verify against user text. */
export function selectFieldsForVerification(
  bag: IntakeFieldBag,
  unresolvedFields: string[],
  opts?: { lean?: boolean }
): IntakeFieldKey[] {
  const out = new Set<IntakeFieldKey>();
  const lean = opts?.lean ?? process.env.NEED_INTAKE_TRUTH_VERIFY_LEAN !== 'false';

  for (const u of unresolvedFields) {
    if (u in bag) out.add(u as IntakeFieldKey);
  }

  for (const key of MONEY_FIELDS) {
    if (bag[key]?.value != null) out.add(key);
  }

  for (const key of LOCATION_FIELDS) {
    if (bag[key]?.value != null) out.add(key);
  }

  if (bag.categorySlug?.value) out.add('categorySlug');
  if (bag.transactionType?.value || bag.dealType?.value) {
    out.add('transactionType');
  }
  if (bag.area?.value != null) out.add('area');
  if (bag.rooms?.value != null) out.add('rooms');

  if (!lean) {
    for (const key of [
      'categorySlug',
      'transactionType',
      'city',
      'area',
      'rahnAmount',
      'monthlyRent',
    ] as IntakeFieldKey[]) {
      out.add(key);
    }
  }

  return [...out].slice(0, MAX_FIELDS_PER_VERIFY);
}
