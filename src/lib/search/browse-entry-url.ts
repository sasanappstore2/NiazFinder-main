import { legacyValueToSlug } from '@/config/categories';
import { getBrowseUrlForCategorySlug } from '@/lib/search/category-browse-url';
import { COUNTRY_SLUG } from '@/config/locations';
import { routeBuilder } from '@/config/routes';
import type { BrowseFilters } from '@/lib/filters/parser';
import { cookieManager } from '@/lib/cookie-manager';
import { citiesToSlugs, isKnownCitySlug } from '@/lib/search/city-slugs';
import {
  scopeFromCookie,
  scopeToBrowseFilters,
  type LocationScope,
} from '@/lib/search/location-scope';

export type BrowseListingType = 'need' | 'business';

export type BrowseUrlOptions = {
  type: BrowseListingType;
  categorySlug?: string;
  parentCategorySlug?: string;
  q?: string;
  citySlug?: string;
};

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

function locationFromScope(scope: LocationScope, citySlugOverride?: string): string {
  if (citySlugOverride) return citySlugOverride;
  if (scope.mode === 'city') return scope.citySlug;
  return COUNTRY_SLUG;
}

/** Build browse URL from an explicit location scope (SSR-safe when scope is country). */
export function buildBrowseUrl(scope: LocationScope, opts: BrowseUrlOptions): string {
  const geoFilters = scopeToBrowseFilters(scope);

  const market = opts.type === 'business' ? 'business' : 'need';
  const filters: Partial<BrowseFilters> = { ...geoFilters };
  if (opts.q?.trim()) filters.q = opts.q.trim();

  const location = locationFromScope(scope, opts.citySlug);

  if (opts.parentCategorySlug && opts.categorySlug) {
    return routeBuilder.search({
      market,
      location,
      parentCategory: opts.parentCategorySlug,
      category: opts.categorySlug,
      filters,
    });
  }

  if (opts.categorySlug) {
    return routeBuilder.search({
      market,
      location,
      category: opts.categorySlug,
      filters,
    });
  }

  return routeBuilder.search({ market, location, filters });
}

/** Country-wide browse URL — matches SSR output for hydration. */
export function getBrowseUrlSSR(opts: BrowseUrlOptions): string {
  return buildBrowseUrl({ mode: 'country' }, opts);
}

export function getBrowseUrl(opts: BrowseUrlOptions): string {
  const scope = typeof window !== 'undefined' ? scopeFromCookie() : { mode: 'country' as const };
  return buildBrowseUrl(scope, opts);
}

/** SPA legacy views → browse URL with saved city + optional category/search. */
export function resolveLegacyBrowsePath(
  view: 'browse-requests' | 'browse-specialists',
  params?: Record<string, string>
): string {
  const type = view === 'browse-requests' ? 'need' : 'business';
  const legacyCat = params?.categoryId ?? params?.categorySlug;
  const slug = legacyCat ? legacyValueToSlug(legacyCat) : null;

  if (slug) {
    return getBrowseUrlForCategorySlug(slug, { type, q: params?.search });
  }

  return getBrowseUrl({ type, q: params?.search });
}
