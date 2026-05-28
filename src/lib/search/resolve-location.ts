import {
  COUNTRY_SLUG,
  getCityBySlug,
  isCitySlug,
  isCountryLocation,
  type CanonicalCity,
} from '@/config/locations';

export type SearchLocation =
  | { kind: 'country'; slug: typeof COUNTRY_SLUG }
  | { kind: 'city'; city: CanonicalCity };

/** Build the SearchLocation from a raw URL segment (returns null if invalid). */
export function resolveLocation(raw: string): SearchLocation | null {
  const slug = raw.toLowerCase();
  if (isCountryLocation(slug)) return { kind: 'country', slug: COUNTRY_SLUG };
  if (isCitySlug(slug)) {
    const city = getCityBySlug(slug)!;
    return { kind: 'city', city };
  }
  return null;
}
