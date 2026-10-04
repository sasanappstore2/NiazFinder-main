import type { RealEstateSubtype } from '@/lib/business/real-estate-subtypes';

/** Subtypes that manage property listings (agent + office/agency). */
export const REAL_ESTATE_LISTING_SUBTYPES = new Set<RealEstateSubtype>([
  'real-estate-agent',
  'real-estate-office',
]);

export function isRealEstateListingSubtype(
  subtype: RealEstateSubtype | string | null | undefined
): boolean {
  return subtype != null && REAL_ESTATE_LISTING_SUBTYPES.has(subtype as RealEstateSubtype);
}
