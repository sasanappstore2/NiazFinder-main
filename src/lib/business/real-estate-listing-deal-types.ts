import { DEAL_TYPE_PROPERTY } from '@/config/category-filters/options';
import { formatTomanAmount, formatPriceText, toAsciiDigits } from '@/lib/format/money';

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

/**
 * Scraped/entered price fields are free text (`String?` in the DB) — usually a
 * plain digit run, sometimes negotiable text like "توافقی". Pure digit runs get
 * the compact "۲۰۰ میلیون تومان" treatment; anything else just gets Persian
 * digits/grouping so raw Latin numerals never reach the UI.
 */
export function formatListingMoneyValue(
  value: string | undefined,
  options?: { includeSuffix?: boolean }
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const ascii = toAsciiDigits(trimmed);
  if (/^\d+$/.test(ascii)) {
    const n = Number(ascii);
    if (Number.isFinite(n)) return formatTomanAmount(n, options);
  }
  return formatPriceText(trimmed);
}

export function listingPriceDisplay(listing: {
  dealType?: PropertyListingDealTypeStored;
  price?: string;
  deposit?: string;
  monthlyRent?: string;
}): string | undefined {
  const deal = normalizeListingDealType(listing.dealType);
  if (isListingRentDeal(listing.dealType)) {
    if (deal === 'rent_rahn_full') return formatListingMoneyValue(listing.deposit);
    if (deal === 'rent_short_term') return formatListingMoneyValue(listing.price);
    // Two distinct amounts — suffix only the trailing one ("۲۰۰ میلیون / ۲۵ میلیون تومان").
    const deposit = formatListingMoneyValue(listing.deposit, { includeSuffix: false });
    const rent = formatListingMoneyValue(listing.monthlyRent);
    const parts = [deposit, rent].filter(Boolean);
    return parts.length ? parts.join(' / ') : undefined;
  }
  return formatListingMoneyValue(listing.price);
}
