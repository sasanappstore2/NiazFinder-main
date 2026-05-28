import type { IntentSchema, IntentType, ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { getSchemaForIntake } from '@/config/need-schemas/resolve-schema';

const SHORT_TERM_SLUGS = new Set([
  'suite-apartment-rent',
  'villa-short-rent',
  'workspace-short-rent',
]);

/** Effective deal for essential-field matrix (path + answers + entities). */
export function inferPropertyDealForIntake(
  categorySlug: string,
  answers: Record<string, unknown>,
  entities: Record<string, string>
): string {
  const d = answers.dealType ?? entities.dealType;
  if (d) return String(d);
  if (SHORT_TERM_SLUGS.has(categorySlug)) return 'rent_short_term';
  if (categorySlug.endsWith('-sale')) return 'buy';
  if (categorySlug.endsWith('-rent')) return 'rent_monthly';
  return '';
}

export function shouldFilterToEssentialRealEstatePropertyIntake(
  intentType: IntentType,
  categorySlug: string
): boolean {
  if (intentType !== 'property_search' && intentType !== 'property_listing') return false;
  if (categorySlug === 'construction-partnership') return false;
  if (categorySlug.includes('pre-sale')) return false;
  const path = getCategoryPath(categorySlug);
  if (path.some((p) => p.slug === 'real-estate-services')) return false;
  return path[0]?.slug === 'real-estate';
}

/**
 * Minimal field keys for `/post` intake (Divar-style matrix). Browse keeps full registry merge.
 */
export function getEssentialRealEstateFieldKeys(categorySlug: string, dealType: string): Set<string> {
  const base = new Set(['dealType', 'propertyKind', 'location', 'details']);
  const isLand = categorySlug.startsWith('land-');
  const isIndustrial = categorySlug.startsWith('industrial-');

  if (SHORT_TERM_SLUGS.has(categorySlug) || dealType === 'rent_short_term') {
    return new Set([
      'dealType',
      'propertyKind',
      'location',
      'details',
      'guestCount',
      'nightlyRent',
      'areaMin',
      'areaMax',
    ]);
  }

  if (dealType === 'buy' || dealType === 'sell') {
    const s = new Set(base);
    s.add('budget');
    s.add('areaMin');
    s.add('areaMax');
    if (!isLand && !isIndustrial) s.add('rooms');
    return s;
  }

  if (
    dealType === 'rent_monthly' ||
    dealType === 'rent_rahn_ejare' ||
    dealType === 'rent_rahn_full'
  ) {
    const s = new Set(base);
    s.add('deposit');
    s.add('monthlyRent');
    if (dealType === 'rent_rahn_ejare' || dealType === 'rent_rahn_full') {
      s.add('rahnAmount');
    }
    s.add('areaMin');
    s.add('areaMax');
    if (!isLand) s.add('rooms');
    return s;
  }

  return base;
}

export function getEffectiveIntakeSchema(
  intentType: IntentType,
  categorySlug: string,
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): IntentSchema {
  const full = getSchemaForIntake(intentType, categorySlug);
  if (!shouldFilterToEssentialRealEstatePropertyIntake(intentType, categorySlug)) {
    return full;
  }
  const deal = inferPropertyDealForIntake(categorySlug, answers, parsed.entities ?? {});
  const essential = getEssentialRealEstateFieldKeys(categorySlug, deal);
  return {
    ...full,
    fields: full.fields.filter((f) => essential.has(f.key)),
  };
}
