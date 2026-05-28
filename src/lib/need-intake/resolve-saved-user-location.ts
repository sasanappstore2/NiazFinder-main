import { cookieManager } from '@/lib/cookie-manager';
import type { City } from '@/lib/location-system';
import { cityFromSlug, locationCityIdToSlug } from '@/lib/search/city-slugs';
import { scopeFromCookie } from '@/lib/search/location-scope';
import { resolveManagedCityForNeighborhoods } from '@/lib/need-intake/sync-intake-location-form';

export interface SavedUserLocation {
  cityName: string;
  citySlug: string;
  neighborhoodName: string | null;
  neighborhoodSlug: string | null;
  neighborhoodSlugs: string[];
}

function neighborhoodFromCookie(citySlug: string): {
  slugs: string[];
  primaryName: string | null;
} {
  const saved = cookieManager.getNeighborhoodSelection(citySlug);
  if (saved?.slugs?.length) {
    return {
      slugs: saved.slugs,
      primaryName: saved.primaryName?.trim() || null,
    };
  }

  const legacy = cookieManager.getPreferences().filters.neighborhood?.trim();
  if (legacy) {
    return { slugs: [], primaryName: legacy };
  }

  return { slugs: [], primaryName: null };
}

/** City/neighborhood from site cookie (and optional URL neighborhood slugs). */
export function resolveSavedUserLocation(
  managedCities: City[],
  opts?: { neighborhoodSlugsFromUrl?: string[] }
): SavedUserLocation | null {
  const scope = scopeFromCookie();
  let city: City | null = null;

  if (scope.mode === 'city' || scope.mode === 'cities') {
    city = scope.cities[0] ?? null;
  } else {
    const slug = cookieManager.getPreferences().location.lastDetectedSlug?.trim();
    if (slug) city = cityFromSlug(slug);
  }

  if (!city?.name?.trim()) return null;

  const managed = resolveManagedCityForNeighborhoods(managedCities, city.name) ?? city;
  const citySlug = locationCityIdToSlug(managed.id);

  const urlSlugs = (opts?.neighborhoodSlugsFromUrl ?? []).map((s) => s.trim()).filter(Boolean);
  const fromCookie = neighborhoodFromCookie(citySlug);

  const slugs = urlSlugs.length > 0 ? urlSlugs : fromCookie.slugs;
  const primarySlug = slugs[0] ?? null;

  return {
    cityName: managed.name,
    citySlug,
    neighborhoodName: fromCookie.primaryName,
    neighborhoodSlug: primarySlug,
    neighborhoodSlugs: slugs,
  };
}
