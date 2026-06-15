/**
 * Bridge between location-system City ids and URL slugs / Persian names.
 *
 * URL slugs are derived from location-system city ids (with a few normalisations
 * like tehran-city → tehran). Filtering uses Persian display names because the
 * API stores `city` as Persian text.
 */

import { getCityBySlug } from '@/config/locations';
import { countries, dedupeCitiesById, type City } from '@/lib/location-system';

const ID_OVERRIDES: Record<string, string> = {
  'tehran-city': 'tehran',
  'isfahan-city': 'isfahan',
  'shiraz-city': 'shiraz',
  'mashhad-city': 'mashhad',
  'tabriz-city': 'tabriz',
  'ahvaz-city': 'ahvaz',
  'qom-city': 'qom',
  'kerman-city': 'kerman',
  'rasht-city': 'rasht',
  'yazd-city': 'yazd',
  'khorasan-razavi-1': 'mashhad',
  'khorasan-razavi-2': 'nishapur',
  nishabur: 'nishapur',
};

/** Flat list of all cities from the location registry. */
export const ALL_LOCATION_CITIES: readonly City[] = dedupeCitiesById(
  countries.flatMap((c) => c.provinces.flatMap((p) => p.cities))
);

const BY_ID = new Map(ALL_LOCATION_CITIES.map((c) => [c.id, c]));
const BY_SLUG = new Map<string, City>();

for (const city of ALL_LOCATION_CITIES) {
  BY_SLUG.set(locationCityIdToSlug(city.id), city);
}

/** Normalise a location-system city id to a URL slug. */
export function locationCityIdToSlug(id: string | number): string {
  const key = String(id).trim();
  return ID_OVERRIDES[key] ?? key;
}

/** Reverse lookup: URL slug or location-system city id → City (or null). */
export function cityFromSlug(slug: string): City | null {
  const raw = slug.toLowerCase().trim();
  return BY_SLUG.get(raw) ?? BY_SLUG.get(locationCityIdToSlug(raw)) ?? null;
}

/** All known URL slugs (for filter validation). */
export function isKnownCitySlug(slug: string): boolean {
  const raw = slug.toLowerCase().trim();
  return BY_SLUG.has(raw) || getCityBySlug(raw) != null;
}

/** Persian display name for API filtering. */
export function citySlugToPersianName(slug: string): string | null {
  const raw = slug.toLowerCase().trim();
  return cityFromSlug(raw)?.name ?? getCityBySlug(raw)?.title ?? null;
}

/** Map selected cities to URL slugs. */
export function citiesToSlugs(cities: City[]): string[] {
  return cities.map((c) => locationCityIdToSlug(c.id));
}

/** Resolve URL slugs back to location-system City objects. */
export function slugsToCities(slugs: string[]): City[] {
  return slugs.map((s) => cityFromSlug(s)).filter((c): c is City => c != null);
}

/** Persian names for a list of URL slugs (for API `cities` filter). */
export function slugsToPersianNames(slugs: string[]): string[] {
  return slugs.map(citySlugToPersianName).filter((n): n is string => Boolean(n));
}
