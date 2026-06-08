/**
 * Unified location scope: country | single city | multi-city | province(s).
 * URL is source of truth on browse; cookie persists selection for return visits.
 */
import type { City } from '@/lib/location-system';
import { COUNTRY_SLUG, isCitySlug } from '@/config/locations';
import { parseFilters, type BrowseFilters } from '@/lib/filters/parser';
import { parseBrowsePath } from '@/lib/search/browse-path';
import { routeBuilder } from '@/config/routes';
import {
  citiesToSlugs,
  cityFromSlug,
  locationCityIdToSlug,
  slugsToCities,
  slugsToPersianNames,
  ALL_LOCATION_CITIES,
} from '@/lib/search/city-slugs';
import {
  getProvinceByIdOrSlug,
  provinceIdToSlug,
  provinceSlugsToPersianNames,
  isKnownProvinceSlug,
} from '@/lib/search/province-slugs';
import { cookieManager } from '@/lib/cookie-manager';

export type LocationScope =
  | { mode: 'country' }
  | { mode: 'city'; citySlug: string; cities: City[] }
  | { mode: 'cities'; slugs: string[]; cities: City[] }
  | { mode: 'provinces'; slugs: string[]; label: string };

export interface LocationSelection {
  cities: City[];
  /** Province ids (location-system) when entire province(s) selected. */
  provinceIds: string[];
}

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

export function scopeIsActive(scope: LocationScope): boolean {
  return scope.mode !== 'country';
}

function formatNamesForHeading(names: string[], countFallback: string): string {
  const filtered = names.filter(Boolean);
  if (filtered.length === 0) return countFallback;
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]}، ${filtered[1]}`;
  const last = filtered[filtered.length - 1];
  return `${filtered.slice(0, -1).join('، ')} و ${last}`;
}

function provinceScopeLabel(slugs: string[]): string {
  return formatNamesForHeading(
    provinceSlugsToPersianNames(slugs),
    `${slugs.length} استان`
  );
}

export function scopeLabel(scope: LocationScope): string {
  switch (scope.mode) {
    case 'country':
      return 'تمام ایران';
    case 'city':
      return scope.cities[0]?.name ?? scope.citySlug;
    case 'cities':
      if (scope.cities.length === 1) return scope.cities[0].name;
      return `${scope.cities.length} شهر`;
    case 'provinces':
      return scope.label;
    default:
      return 'تمام ایران';
  }
}

/**
 * Bridge: URL path slug or Persian city name → canonical browse city slug + Persian name.
 * Single entry for intake, browse filters, and geo API (location-system SSOT via city-slugs).
 */
export function resolveCityForBrowse(
  pathSlugOrId: string | null | undefined,
  persianName?: string | null
): { slug: string | null; persianName: string | null } {
  const slugInput = pathSlugOrId?.trim().toLowerCase() || null;
  if (slugInput) {
    const city = cityFromSlug(slugInput);
    if (city) {
      return { slug: locationCityIdToSlug(city.id), persianName: city.name };
    }
  }

  const name = persianName?.trim();
  if (name) {
    const byName = ALL_LOCATION_CITIES.find((c) => c.name === name);
    if (byName) {
      return { slug: locationCityIdToSlug(byName.id), persianName: byName.name };
    }
    if (slugInput) {
      return { slug: slugInput, persianName: name };
    }
    return { slug: null, persianName: name };
  }

  return { slug: slugInput, persianName: null };
}

/** Human-readable location label for browse H1 / page title (comma-separated city names). */
export function scopeLabelForHeading(scope: LocationScope): string {
  switch (scope.mode) {
    case 'country':
      return 'سراسر ایران';
    case 'city':
      return scope.cities[0]?.name ?? scope.citySlug;
    case 'cities': {
      const names = scope.cities.map((c) => c.name).filter(Boolean);
      return formatNamesForHeading(names, `${scope.slugs.length} شهر`);
    }
    case 'provinces':
      return provinceScopeLabel(scope.slugs);
    default:
      return 'سراسر ایران';
  }
}

/** Normalize URL province slugs to canonical/known slugs. */
function normalizeProvinceSlugs(slugs: string[]): string[] {
  return slugs
    .map((s) => provinceIdToSlug(s.trim().toLowerCase()))
    .filter((s) => isKnownProvinceSlug(s));
}

export function scopeFromUrl(pathname: string, searchParams: ParamSource): LocationScope {
  const params = toSearchParams(searchParams);
  const filters = parseFilters(params);
  const { pathLocation, citySlug: pathCitySlug } = parseBrowsePath(pathname);

  const provinceSlugs = normalizeProvinceSlugs(filters.provinces);
  if (provinceSlugs.length > 0) {
    return { mode: 'provinces', slugs: provinceSlugs, label: provinceScopeLabel(provinceSlugs) };
  }

  const citySlugsFromQuery = [...filters.cities];
  if (pathCitySlug && pathLocation !== COUNTRY_SLUG && !citySlugsFromQuery.includes(pathCitySlug)) {
    citySlugsFromQuery.unshift(pathCitySlug);
  }

  if (citySlugsFromQuery.length > 1) {
    const cities = slugsToCities(citySlugsFromQuery);
    return { mode: 'cities', slugs: citySlugsFromQuery, cities };
  }

  if (citySlugsFromQuery.length === 1) {
    const slug = citySlugsFromQuery[0];
    const city = cityFromSlug(slug);
    return {
      mode: 'city',
      citySlug: slug,
      cities: city ? [city] : [],
    };
  }

  if (pathCitySlug && pathLocation !== COUNTRY_SLUG && isCitySlug(pathCitySlug)) {
    const city = cityFromSlug(pathCitySlug);
    return {
      mode: 'city',
      citySlug: pathCitySlug,
      cities: city ? [city] : [],
    };
  }

  return { mode: 'country' };
}

export function scopeFromCookie(): LocationScope {
  const loc = cookieManager.getPreferences().location;
  const provinceIds = loc.selectedProvinceIds ?? [];

  if (provinceIds.length > 0) {
    const slugs = provinceIds.map(provinceIdToSlug);
    const labels = provinceIds
      .map((id) => getProvinceByIdOrSlug(id)?.name)
      .filter((n): n is string => Boolean(n));
    return {
      mode: 'provinces',
      slugs,
      label: formatNamesForHeading(labels, `${provinceIds.length} استان`),
    };
  }

  const cities = loc.selectedCities;
  if (cities.length === 0) return { mode: 'country' };

  const slugs = citiesToSlugs(cities);
  if (slugs.length === 1 && isCitySlug(slugs[0])) {
    return { mode: 'city', citySlug: slugs[0], cities };
  }
  return { mode: 'cities', slugs, cities };
}

export function resolveLocationScope(pathname: string, searchParams: ParamSource): LocationScope {
  const fromUrl = scopeFromUrl(pathname, searchParams);
  if (scopeIsActive(fromUrl)) return fromUrl;
  return scopeFromCookie();
}

export function scopeToBrowseFilters(scope: LocationScope): Partial<BrowseFilters> {
  switch (scope.mode) {
    case 'country':
      return { city: null, cities: [], provinces: [], neighborhoods: [] };
    case 'city':
      return {
        city: null,
        cities: [],
        provinces: [],
        neighborhoods: [],
      };
    case 'cities':
      return {
        city: null,
        cities: scope.slugs,
        provinces: [],
        neighborhoods: [],
      };
    case 'provinces':
      return {
        city: null,
        cities: [],
        provinces: scope.slugs,
        neighborhoods: [],
      };
    default:
      return {};
  }
}

export function scopeCitySlugs(scope: LocationScope): string[] {
  switch (scope.mode) {
    case 'city':
      return [scope.citySlug];
    case 'cities':
      return scope.slugs;
    default:
      return [];
  }
}

export function scopeProvinceSlugs(scope: LocationScope): string[] {
  return scope.mode === 'provinces' ? scope.slugs : [];
}

/** Persian city names for API `cities` param. */
export function scopeCityPersianNames(scope: LocationScope): string[] {
  if (scope.mode === 'city' || scope.mode === 'cities') {
    return slugsToPersianNames(scopeCitySlugs(scope));
  }
  return [];
}

export function scopeProvincePersianNames(scope: LocationScope): string[] {
  return provinceSlugsToPersianNames(scopeProvinceSlugs(scope));
}

export function selectionToScope(selection: LocationSelection): LocationScope {
  const { cities, provinceIds } = selection;
  if (provinceIds.length > 0) {
    const slugs = provinceIds.map(provinceIdToSlug);
    const labels = provinceIds
      .map((id) => getProvinceByIdOrSlug(id)?.name)
      .filter((n): n is string => Boolean(n));
    return {
      mode: 'provinces',
      slugs,
      label: formatNamesForHeading(labels, `${provinceIds.length} استان`),
    };
  }

  if (cities.length === 0) return { mode: 'country' };

  const slugs = citiesToSlugs(cities);
  if (slugs.length === 1 && isCitySlug(slugs[0])) {
    return { mode: 'city', citySlug: slugs[0], cities };
  }
  return { mode: 'cities', slugs, cities };
}

export function scopeToCookieSelection(scope: LocationScope): LocationSelection {
  switch (scope.mode) {
    case 'country':
      return { cities: [], provinceIds: [] };
    case 'city':
    case 'cities':
      return { cities: scope.cities, provinceIds: [] };
    case 'provinces':
      return {
        cities: [],
        provinceIds: scope.slugs.map((s) => getProvinceByIdOrSlug(s)?.id ?? s),
      };
    default:
      return { cities: [], provinceIds: [] };
  }
}

export function persistScopeToCookie(scope: LocationScope): void {
  const sel = scopeToCookieSelection(scope);
  cookieManager.updateLocation(sel.cities, sel.provinceIds);
}

/**
 * Compress city list: full provinces → provinceIds, remainder → cities.
 */
export function compressCitySelection(
  selectedCities: City[],
  provinces: { id: string; cities: City[] }[]
): LocationSelection {
  const selectedIds = new Set(selectedCities.map((c) => c.id));
  const provinceIds: string[] = [];
  const remainder: City[] = [...selectedCities];

  for (const province of provinces) {
    const ids = province.cities.map((c) => c.id);
    if (ids.length === 0) continue;
    const allSelected = ids.every((id) => selectedIds.has(id));
    if (allSelected) {
      provinceIds.push(province.id);
      for (const id of ids) {
        const idx = remainder.findIndex((c) => c.id === id);
        if (idx >= 0) remainder.splice(idx, 1);
      }
    }
  }

  return { cities: remainder, provinceIds };
}

/** Count distinct cities in a selection (expands full provinces into their cities). */
export function countSelectedCities(
  selection: LocationSelection,
  provinces: { id: string; cities: City[] }[]
): number {
  const fromProvinces = new Set<string>();
  for (const provinceId of selection.provinceIds) {
    const province = provinces.find((p) => p.id === provinceId);
    if (!province) continue;
    for (const city of province.cities) {
      fromProvinces.add(city.id);
    }
  }
  for (const city of selection.cities) {
    fromProvinces.add(city.id);
  }
  return fromProvinces.size;
}

export function totalIranCityCount(provinces: { cities: City[] }[]): number {
  return provinces.reduce((sum, province) => sum + province.cities.length, 0);
}

/** Badge label for location picker: city count, or ∞ for all Iran. */
export function formatLocationBadgeLabel(
  selection: LocationSelection,
  provinces: { id: string; cities: City[] }[],
  opts?: { compact?: boolean }
): string {
  const total = totalIranCityCount(provinces);
  const isCountry =
    selection.cities.length === 0 && selection.provinceIds.length === 0;
  const cityCount = countSelectedCities(selection, provinces);

  if (isCountry || (total > 0 && cityCount >= total)) {
    return '∞';
  }

  if (cityCount <= 0) return '';

  if (opts?.compact && cityCount > 9) return '9+';
  return String(cityCount);
}

export function buildUrlFromLocationScope(
  pathname: string,
  searchParams: ParamSource,
  scope: LocationScope
): string {
  const params = toSearchParams(searchParams);
  const existing = parseFilters(params);
  const browseCtx = parseBrowsePath(pathname);
  const category = browseCtx.categorySlug;
  const parentCategory = browseCtx.parentCategorySlug;
  const market = browseCtx.market ?? 'need';

  const geoFilters = scopeToBrowseFilters(scope);
  const filters: Partial<BrowseFilters> = {
    ...existing,
    ...geoFilters,
    neighborhoods: [],
  };

  if (scope.mode === 'country') {
    return routeBuilder.search({
      market,
      location: COUNTRY_SLUG,
      category,
      parentCategory,
      filters,
    });
  }

  if (scope.mode === 'city') {
    return routeBuilder.search({
      market,
      location: scope.citySlug,
      category,
      parentCategory,
      filters,
    });
  }

  return routeBuilder.search({
    market,
    location: COUNTRY_SLUG,
    category,
    parentCategory,
    filters,
  });
}

/** Whether a listing city name falls inside the active scope. */
export function isCityNameInScope(scope: LocationScope, cityName: string | null | undefined): boolean {
  if (!scopeIsActive(scope) || !cityName?.trim()) return true;
  const norm = cityName.trim();

  if (scope.mode === 'provinces') {
    const allowed = scopeCityPersianNames(scope);
    if (allowed.length === 0) return true;
    return allowed.some((n) => norm.includes(n) || n.includes(norm));
  }

  const allowed = scopeCityPersianNames(scope);
  if (allowed.length > 0) return allowed.some((n) => norm.includes(n) || n.includes(norm));

  if (scope.mode === 'city' || scope.mode === 'cities') {
    return scope.cities.some((c) => c.name === norm || norm.includes(c.name) || c.name.includes(norm));
  }

  return true;
}

export function isListingInScope(
  scope: LocationScope,
  listing: { city?: string | null; province?: string | null }
): boolean {
  if (!scopeIsActive(scope)) return true;

  if (scope.mode === 'provinces') {
    const provinceNames = scopeProvincePersianNames(scope);
    if (listing.province && provinceNames.some((p) => listing.province!.includes(p) || p.includes(listing.province!))) {
      return true;
    }
    const allowedCities = scopeCityPersianNames(scope);
    if (listing.city && allowedCities.some((c) => listing.city!.includes(c) || c.includes(listing.city!))) {
      return true;
    }
    // All cities in selected provinces — match any city in those provinces
    for (const slug of scope.slugs) {
      const prov = getProvinceByIdOrSlug(slug);
      if (prov && listing.city && prov.cities.some((c) => c.name === listing.city || listing.city!.includes(c.name))) {
        return true;
      }
    }
    return false;
  }

  if (scope.mode === 'country') return true;

  if (scope.mode !== 'city' && scope.mode !== 'cities') return false;

  if (!listing.city) return false;
  return scope.cities.some(
    (c) =>
      listing.city === c.name ||
      listing.city!.includes(c.name) ||
      c.name.includes(listing.city!)
  );
}

export function buildScopedSearchUrl(
  scope: LocationScope,
  opts: {
    category?: string;
    parentCategory?: string;
    type?: BrowseFilters['type'];
    /** Target city from listing — only linked if inside scope when scope active. */
    listingCity?: string | null;
    listingProvince?: string | null;
  } = {}
): string | null {
  if (scopeIsActive(scope) && opts.listingCity) {
    if (!isListingInScope(scope, { city: opts.listingCity, province: opts.listingProvince })) {
      return null;
    }
  }

  const filters: Partial<BrowseFilters> = {
    ...scopeToBrowseFilters(scope),
    type: opts.type,
  };

  if (scope.mode === 'city') {
    return routeBuilder.search({
      location: scope.citySlug,
      category: opts.category,
      parentCategory: opts.parentCategory,
      filters,
    });
  }

  return routeBuilder.search({
    location: COUNTRY_SLUG,
    category: opts.category,
    parentCategory: opts.parentCategory,
    filters,
  });
}

/** @deprecated Use buildUrlFromLocationScope — kept for callers during migration. */
export function buildUrlFromCitySelection(
  pathname: string,
  searchParams: ParamSource,
  selectedCities: City[],
  provinces?: { id: string; cities: City[] }[]
): string {
  const selection =
    provinces && provinces.length > 0
      ? compressCitySelection(selectedCities, provinces)
      : { cities: selectedCities, provinceIds: [] };
  const scope = selectionToScope(selection);
  return buildUrlFromLocationScope(pathname, searchParams, scope);
}

export function citiesFromUrl(pathname: string, searchParams: ParamSource): City[] {
  const scope = scopeFromUrl(pathname, searchParams);
  if (scope.mode === 'city' || scope.mode === 'cities') return scope.cities;
  if (scope.mode === 'provinces') {
    const cities: City[] = [];
    for (const slug of scope.slugs) {
      const p = getProvinceByIdOrSlug(slug);
      if (p) cities.push(...p.cities);
    }
    return cities;
  }
  return [];
}

export function citySlugFromScope(scope: LocationScope): string | undefined {
  return scope.mode === 'city' ? scope.citySlug : undefined;
}
