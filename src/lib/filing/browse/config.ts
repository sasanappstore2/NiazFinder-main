import { cityFromSlug } from '@/lib/search/city-slugs';

/** Default city scope for public filing browse (`/f`). */
export const FILING_BROWSE_DEFAULT_CITY_SLUG = 'mashhad';

export function filingBrowseDefaultCityId(): string {
  return cityFromSlug(FILING_BROWSE_DEFAULT_CITY_SLUG)?.id ?? FILING_BROWSE_DEFAULT_CITY_SLUG;
}

export function filingBrowseDefaultCityName(): string {
  return cityFromSlug(FILING_BROWSE_DEFAULT_CITY_SLUG)?.name ?? 'مشهد';
}
