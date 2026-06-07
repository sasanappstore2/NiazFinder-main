import type { ParsedIntent } from '@/contracts/need-intake';
import { refinePropertyCategorySlug } from '@/lib/need-intake/intent-parser';
import { normalizeCategoryPair } from '@/config/categories';

const DEAL_EQUIV: Record<string, readonly string[]> = {
  buy: ['buy'],
  sell: ['sell'],
  rent: ['rent', 'rent_monthly', 'rent_daily', 'rent_short_term'],
  rent_monthly: ['rent', 'rent_monthly', 'rent_daily'],
  rent_daily: ['rent', 'rent_daily', 'rent_short_term', 'rent_monthly'],
  rent_rahn_full: ['rent_rahn_full', 'full_deposit', 'rent'],
  rent_rahn_ejare: ['rent_rahn_ejare', 'deposit_and_rent', 'rent', 'rent_rahn_full'],
  rent_short_term: ['rent_short_term', 'rent_daily', 'rent'],
  partnership: ['partnership'],
};

export function dealsEquivalent(a?: string, b?: string): boolean {
  if (!a || !b) return true;
  if (a === b) return true;
  for (const group of Object.values(DEAL_EQUIV)) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  return false;
}

export function categoriesCompatible(
  parsedSlug: string,
  teacherSlug: string,
  propertyKind?: string
): boolean {
  if (parsedSlug === teacherSlug) return true;
  const pRoot = parsedSlug.split('-')[0] ?? parsedSlug;
  const tRoot = teacherSlug.split('-')[0] ?? teacherSlug;
  if (pRoot === tRoot) return true;
  if (propertyKind === 'apartment' && teacherSlug.includes('apartment')) {
    return parsedSlug.includes('apartment') || parsedSlug.includes('residential');
  }
  if (propertyKind && teacherSlug.startsWith(propertyKind)) {
    return parsedSlug.includes(propertyKind) || parsedSlug.includes('residential');
  }
  return false;
}

export function intentsCompatible(
  parsed: ParsedIntent['intentType'],
  teacher: ParsedIntent['intentType']
): boolean {
  if (parsed === teacher) return true;
  const propertyPair =
    (parsed === 'property_search' && teacher === 'property_listing') ||
    (parsed === 'property_listing' && teacher === 'property_search');
  if (propertyPair) return true;
  return false;
}

/** Normalize parsed intent after rules for consistent prefill slots. */
export function postProcessParsedForPrefill(parsed: ParsedIntent): ParsedIntent {
  const entities = { ...parsed.entities };
  if (entities.dealType === 'rent') {
    entities.dealType = 'rent_monthly';
  }

  const refined = refinePropertyCategorySlug(
    parsed.subcategorySlug ?? parsed.categorySlug,
    entities,
    parsed.rawText
  );
  const pair = normalizeCategoryPair(refined);

  return {
    ...parsed,
    categorySlug: pair.categorySlug,
    subcategorySlug: pair.subcategorySlug,
    entities,
  };
}
