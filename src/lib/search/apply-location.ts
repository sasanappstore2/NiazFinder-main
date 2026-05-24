/**
 * Build canonical search URLs when the user picks cities in the header selector.
 * Mirrors Divar behaviour:
 *   - 0 cities  → /s/iran
 *   - 1 city    → /s/{city}
 *   - 2+ cities → /s/iran?cities=a,b,c
 * Category segments in the path are preserved; other query filters (type, price…) too.
 */

import type { City } from '@/lib/location-system';
import { routeBuilder } from '@/config/routes';
import { parseFilters, type BrowseFilters } from '@/lib/filters/parser';
import { resolveSearchSegments } from '@/lib/search/resolve-segments';
import { COUNTRY_SLUG, isCitySlug } from '@/config/locations';
import { citiesToSlugs, cityFromSlug, slugsToCities } from '@/lib/search/city-slugs';

type ParamSource = URLSearchParams | Readonly<Record<string, string | string[] | undefined>>;

function toSearchParams(src: ParamSource): URLSearchParams {
  if (src instanceof URLSearchParams) return src;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(src)) {
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else if (v != null) p.set(k, v);
  }
  return p;
}

/** Extract category + path location from a /s/... pathname. */
function parseSearchPath(pathname: string): {
  pathLocation: string;
  category?: string;
  parentCategory?: string;
} {
  if (!pathname.startsWith('/s/')) {
    return { pathLocation: COUNTRY_SLUG };
  }

  const parts = pathname.replace(/^\/s\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { pathLocation: COUNTRY_SLUG };

  const [rawLoc, ...segments] = parts;
  const ctx = resolveSearchSegments(rawLoc, segments);

  if (ctx.kind === 'invalid-location') {
    return { pathLocation: COUNTRY_SLUG };
  }

  const pathLocation =
    ctx.location.kind === 'country' ? COUNTRY_SLUG : ctx.location.city.slug;

  if (ctx.kind === 'category') {
    return { pathLocation, category: ctx.category.slug };
  }
  if (ctx.kind === 'parent-child') {
    return {
      pathLocation,
      parentCategory: ctx.parent.slug,
      category: ctx.category.slug,
    };
  }

  return { pathLocation };
}

/**
 * Build the URL to navigate to after the user confirms a city selection.
 */
export function buildUrlFromCitySelection(
  pathname: string,
  searchParams: ParamSource,
  selectedCities: City[]
): string {
  const params = toSearchParams(searchParams);
  const existingFilters = parseFilters(params);
  const slugs = citiesToSlugs(selectedCities);
  const { category, parentCategory } = parseSearchPath(pathname);

  const filters: Partial<BrowseFilters> = {
    ...existingFilters,
    city: null,
    cities: [],
  };

  // No selection → country-wide (preserve category + other filters)
  if (slugs.length === 0) {
    return routeBuilder.search({
      location: COUNTRY_SLUG,
      category,
      parentCategory,
      filters,
    });
  }

  // Canonical single city → /s/{city} (Divar style)
  if (slugs.length === 1 && isCitySlug(slugs[0])) {
    return routeBuilder.search({
      location: slugs[0],
      category,
      parentCategory,
      filters,
    });
  }

  // Multi-city or non-canonical city → /s/iran?cities=…
  return routeBuilder.search({
    location: COUNTRY_SLUG,
    category,
    parentCategory,
    filters: {
      ...filters,
      cities: slugs,
    },
  });
}

/**
 * Derive the selected cities from the current URL (for syncing the header selector).
 */
export function citiesFromUrl(pathname: string, searchParams: ParamSource): City[] {
  const params = toSearchParams(searchParams);
  const filters = parseFilters(params);

  if (filters.cities.length > 0) {
    return slugsToCities(filters.cities);
  }

  const { pathLocation } = parseSearchPath(pathname);
  if (pathLocation !== COUNTRY_SLUG) {
    const city = cityFromSlug(pathLocation);
    if (city) return [city];
  }

  return [];
}
