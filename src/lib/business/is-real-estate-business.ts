import {
  isRealEstateSubtype,
  type RealEstateSubtype,
} from '@/lib/business/real-estate-subtypes';

export type { RealEstateSubtype };
export { isRealEstateSubtype, REAL_ESTATE_SUBTYPES } from '@/lib/business/real-estate-subtypes';

/** First registered real-estate occupation slug on the profile. */
export function getPrimaryRealEstateSubtypeFromSlugs(
  slugs: string[] | undefined | null
): RealEstateSubtype | null {
  if (!slugs?.length) return null;
  for (const slug of slugs) {
    if (isRealEstateSubtype(slug)) return slug;
  }
  return null;
}

export function isRealEstateBusiness(
  occupationSlugs: string[] | undefined | null
): boolean {
  return getPrimaryRealEstateSubtypeFromSlugs(occupationSlugs) !== null;
}
