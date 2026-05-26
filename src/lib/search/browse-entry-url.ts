/**
 * Build browse URLs with saved city from cookies + listing type.
 */

import { getCategoryPath, legacyValueToSlug } from '@/config/categories';
import { COUNTRY_SLUG } from '@/config/locations';
import { routeBuilder } from '@/config/routes';
import type { BrowseFilters } from '@/lib/filters/parser';
import { cookieManager } from '@/lib/cookie-manager';
import { citiesToSlugs, isKnownCitySlug } from '@/lib/search/city-slugs';

export type BrowseListingType = 'need' | 'business';

/** Primary city slug from cookie, or country-wide. */
export function getSavedCitySlug(): string {
  if (typeof window === 'undefined') return COUNTRY_SLUG;

  const cities = cookieManager.getPreferences().location.selectedCities;
  if (cities.length === 1) {
    const slug = citiesToSlugs(cities)[0];
    return isKnownCitySlug(slug) ? slug : COUNTRY_SLUG;
  }
  return COUNTRY_SLUG;
}

export function getBrowseUrl(opts: {
  type: BrowseListingType;
  categorySlug?: string;
  parentCategorySlug?: string;
  q?: string;
  citySlug?: string;
}): string {
  const cities = typeof window !== 'undefined'
    ? cookieManager.getPreferences().location.selectedCities
    : [];
  const slugs = cities.length > 1 ? citiesToSlugs(cities) : [];

  const filters: Partial<BrowseFilters> = { type: opts.type };
  if (opts.q?.trim()) filters.q = opts.q.trim();
  if (slugs.length > 1) filters.cities = slugs;

  const location =
    opts.citySlug ??
    (cities.length === 1 ? citiesToSlugs(cities)[0] : COUNTRY_SLUG);

  if (opts.parentCategorySlug && opts.categorySlug) {
    return routeBuilder.search({
      location,
      parentCategory: opts.parentCategorySlug,
      category: opts.categorySlug,
      filters,
    });
  }

  if (opts.categorySlug) {
    return routeBuilder.search({
      location,
      category: opts.categorySlug,
      filters,
    });
  }

  return routeBuilder.search({ location, filters });
}

/** SPA legacy views → browse URL with saved city + optional category/search. */
export function resolveLegacyBrowsePath(
  view: 'browse-requests' | 'browse-specialists',
  params?: Record<string, string>
): string {
  const type = view === 'browse-requests' ? 'need' : 'business';
  const legacyCat = params?.categoryId ?? params?.categorySlug;
  const slug = legacyCat ? legacyValueToSlug(legacyCat) : null;

  if (slug && type === 'need') {
    const path = getCategoryPath(slug);
    const leaf = path[path.length - 1];
    if (leaf && leaf.depth === 2 && path.length >= 2) {
      const parent = path[path.length - 2]!;
      return getBrowseUrl({
        type: 'need',
        parentCategorySlug: parent.slug,
        categorySlug: leaf.slug,
        q: params?.search,
      });
    }
    return getBrowseUrl({ type: 'need', categorySlug: slug, q: params?.search });
  }

  return getBrowseUrl({ type, q: params?.search });
}
