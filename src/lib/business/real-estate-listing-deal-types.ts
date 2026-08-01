import { DEAL_TYPE_PROPERTY } from '@/config/category-filters/options';

/** Canonical deal types for business property listings (aligned with need intake). */
export const PROPERTY_LISTING_DEAL_TYPES = [
  { value: 'sell', label: 'خرید' },
  { value: 'rent_rahn_ejare', label: 'رهن و اجاره' },
  { value: 'rent_rahn_full', label: 'رهن کامل' },
  { value: 'rent_short_term', label: 'اجاره روزانه' },
] as const;

export type PropertyListingDealType = (typeof PROPERTY_LISTING_DEAL_TYPES)[number]['value'];

/** Legacy `sale` / `rent` from early hub builds */
export type PropertyListingDealTypeStored = PropertyListingDealType | 'sale' | 'rent';

const RENT_DEAL_TYPES = new Set<PropertyListingDealTypeStored>([
  'rent',
  'rent_rahn_ejare',
  'rent_rahn_full',
  'rent_short_term',
]);

export function normalizeListingDealType(
  dealType: PropertyListingDealTypeStored | undefined
): PropertyListingDealType {
  if (!dealType || dealType === 'sale') return 'sell';
  if (dealType === 'rent') return 'rent_rahn_ejare';
  return dealType;
}

export function isListingRentDeal(dealType: PropertyListingDealTypeStored | undefined): boolean {
  return RENT_DEAL_TYPES.has(normalizeListingDealType(dealType) as PropertyListingDealTypeStored);
}

export function isListingSaleDeal(dealType: PropertyListingDealTypeStored | undefined): boolean {
  return normalizeListingDealType(dealType) === 'sell';
}

export function isListingShortTermDeal(dealType: PropertyListingDealTypeStored | undefined): boolean {
  return normalizeListingDealType(dealType) === 'rent_short_term';
}

export function propertyListingDealTypeLabel(
  dealType: PropertyListingDealTypeStored | undefined
): string {
  const normalized = normalizeListingDealType(dealType);
  return (
    PROPERTY_LISTING_DEAL_TYPES.find((d) => d.value === normalized)?.label ??
    DEAL_TYPE_PROPERTY.find((d) => d.value === normalized)?.label ??
    normalized
  );
}

export function inferListingDealTypeFromCategory(
  categorySlug: string | undefined
): PropertyListingDealType | undefined {
  if (!categorySlug) return undefined;
  if (
    categorySlug === 'suite-apartment-rent' ||
    categorySlug === 'villa-short-rent' ||
    categorySlug === 'workspace-short-rent'
  ) {
    return 'rent_short_term';
  }
  if (categorySlug.endsWith('-rent')) return 'rent_rahn_ejare';
  if (
    categorySlug.endsWith('-sale') ||
    categorySlug === 'construction-partnership' ||
    categorySlug === 'pre-sale-services'
  ) {
    return 'sell';
  }
  return undefined;
}

export function listingPriceDisplay(listing: {
  dealType?: PropertyListingDealTypeStored;
  price?: string;
  deposit?: string;
  monthlyRent?: string;
}): string | undefined {
  const deal = normalizeListingDealType(listing.dealType);
  if (isListingRentDeal(listing.dealType)) {
    if (deal === 'rent_rahn_full') return listing.deposit;
    if (deal === 'rent_short_term') return listing.price;
    const parts = [listing.deposit, listing.monthlyRent].filter(Boolean);
    return parts.length ? parts.join(' / ') : undefined;
  }
  return listing.price;
}
