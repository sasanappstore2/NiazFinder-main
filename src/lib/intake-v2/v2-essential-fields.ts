import { inferPropertyDealForIntake } from '@/lib/need-intake/essential-intake-schema';

const SHORT_TERM_SLUGS = new Set([
  'suite-apartment-rent',
  'villa-short-rent',
  'workspace-short-rent',
]);

const COMMERCIAL_LEAF = new Set(['shop-rent', 'office-rent', 'shop-sale', 'office-sale']);
const LAND_SLUGS = /^land-/;
const INDUSTRIAL_SLUGS = /^industrial-/;

/** V2 required field keys per category + deal (stricter than /post essential). */
export function getV2RequiredFieldKeys(
  categorySlug: string,
  dealType: string
): string[] {
  const base = ['dealType', 'propertyKind', 'location'];
  const isLand = LAND_SLUGS.test(categorySlug);
  const isIndustrial = INDUSTRIAL_SLUGS.test(categorySlug);
  const isCommercial = COMMERCIAL_LEAF.has(categorySlug);

  if (SHORT_TERM_SLUGS.has(categorySlug) || dealType === 'rent_short_term') {
    return [...base, 'areaMin', 'nightlyRent'];
  }

  if (dealType === 'buy' || dealType === 'sell') {
    const keys = [...base, 'budget', 'areaMin'];
    if (!isLand && !isIndustrial && !isCommercial) keys.push('rooms');
    return keys;
  }

  if (
    dealType === 'rent_monthly' ||
    dealType === 'rent_rahn_ejare' ||
    dealType === 'rent_rahn_full'
  ) {
    const keys = [...base];
    if (!isLand && !isIndustrial && !isCommercial) keys.push('rooms');
    if (dealType === 'rent_rahn_ejare' || dealType === 'rent_rahn_full') {
      keys.push('deposit', 'monthlyRent');
      if (!isLand) keys.push('areaMin');
    } else {
      if (!isLand) keys.push('areaMin');
      keys.push('deposit', 'monthlyRent');
    }
    if (isCommercial) keys.push('floorMin');
    if (dealType === 'rent_rahn_ejare' || dealType === 'rent_rahn_full') {
      keys.push('rahnAmount');
    }
    return keys;
  }

  return base;
}

export function inferV2DealType(
  categorySlug: string,
  answers: Record<string, unknown>,
  entities: Record<string, string>
): string {
  return inferPropertyDealForIntake(categorySlug, answers, entities);
}

export function getV2FieldLabel(key: string): string {
  const labels: Record<string, string> = {
    dealType: 'نوع معامله',
    propertyKind: 'نوع ملک',
    location: 'شهر و محله',
    budget: 'بودجه',
    deposit: 'ودیعه',
    monthlyRent: 'اجاره ماهانه',
    rahnAmount: 'مبلغ رهن',
    areaMin: 'متراژ',
    areaMax: 'حداکثر متراژ',
    rooms: 'تعداد خواب',
    floorMin: 'طبقه',
    nightlyRent: 'اجاره روزانه',
    guestCount: 'تعداد نفر',
    details: 'توضیحات',
  };
  return labels[key] ?? key;
}
