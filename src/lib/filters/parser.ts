/**
 * Centralized, type-safe search filter parser/serializer.
 *
 * Filters are derived from query params ONLY. The path encodes identity and
 * canonical SEO context (location, category), never filter state.
 *
 * Supported params (Divar-style, kebab-case where it makes sense):
 *   ── Identity / scope ──
 *   - type        : 'need' | 'business' | 'all'
 *   - q           : free-text search query
 *   - status      : free-form status slug (e.g. 'open', 'closed')
 *
 *   ── Geo (multi-value, comma-separated) ──
 *   - cities      : canonical city slugs        (e.g. ?cities=tehran,mashhad)
 *   - provinces   : canonical province slugs    (e.g. ?provinces=tehran,fars)
 *   - city        : single canonical city slug  (deprecated; use `cities`)
 *
 *   ── Money / range ──
 *   - price       : "min-max" shorthand (e.g. "10000000-100000000",
 *                   "10000000-" for min-only, "-100000000" for max-only)
 *
 *   ── Booleans ──
 *   - verified    : 'true' / 'false'
 *   - has-photo   : 'true'  (Divar parity)
 *   - urgent      : 'true'
 *
 *   ── Recency window ──
 *   - recent      : '24h' | '7d' | '30d'
 *
 *   ── Sort ──
 *   - sort        : 'newest' | 'oldest' | 'price-asc' | 'price-desc'
 *                   | 'rating' | 'popular'
 *
 * Default value rules: invalid inputs fall back to defaults; unknown city/
 * province/category slugs are silently dropped.
 */

import { isCitySlug } from '@/config/locations';
import { isKnownProvinceSlug } from '@/lib/search/province-slugs';
import { isKnownCitySlug } from '@/lib/search/city-slugs';
import {
  RESERVED_BROWSE_PARAMS,
  parseRangeShorthand,
  RANGE_PARAM_MAP,
} from '@/config/category-filters/attr-params';
import { DEAL_TYPE_PROPERTY } from '@/config/category-filters/options';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ListingType = 'need' | 'business' | 'all';

export type SortKey =
  | 'newest'
  | 'oldest'
  | 'price-asc'
  | 'price-desc'
  | 'rating'
  | 'popular';

export type RecentWindow = '24h' | '7d' | '30d';

export interface BrowseFilters {
  type: ListingType;
  q: string | null;
  status: string | null;

  /** @deprecated Single-city — use `cities` (kept for backward compat). */
  city: string | null;
  cities: string[];
  provinces: string[];
  /** Neighborhood slugs (comma-separated in URL). */
  neighborhoods: string[];

  priceMin: number | null;
  priceMax: number | null;

  verified: boolean | null;
  hasPhoto: boolean | null;
  urgent: boolean | null;

  recent: RecentWindow | null;
  sort: SortKey;

  /** Category-specific filters (synced with intake `dynamicAnswers` keys). */
  attributes: Record<string, string>;
}

export const DEFAULT_FILTERS: BrowseFilters = {
  type: 'all',
  q: null,
  status: null,
  city: null,
  cities: [],
  provinces: [],
  neighborhoods: [],
  priceMin: null,
  priceMax: null,
  verified: null,
  hasPhoto: null,
  urgent: null,
  recent: null,
  sort: 'newest',
  attributes: {},
};

const DEAL_TYPE_VALUES = new Set<string>(DEAL_TYPE_PROPERTY.map((o) => o.value));

const VALID_TYPES: ReadonlySet<ListingType> = new Set(['need', 'business', 'all']);
const VALID_SORTS: ReadonlySet<SortKey> = new Set([
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'rating',
  'popular',
]);
const VALID_RECENT: ReadonlySet<RecentWindow> = new Set(['24h', '7d', '30d']);

// ─────────────────────────────────────────────────────────────────────────────
// Param-source abstraction (works with URLSearchParams or Next.js searchParams)
// ─────────────────────────────────────────────────────────────────────────────

type ParamSource =
  | URLSearchParams
  | Readonly<Record<string, string | string[] | undefined>>;

function getString(src: ParamSource, key: string): string | null {
  if (src instanceof URLSearchParams) {
    const v = src.get(key);
    return v === null || v === '' ? null : v;
  }
  const v = src[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return v == null || v === '' ? null : v;
}

function parseCsv(value: string | null, validate: (s: string) => boolean): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .filter(validate)
    )
  );
}

function isNeighborhoodSlug(s: string): boolean {
  return /^[\u0600-\u06FFa-z0-9-]+$/.test(s) && s.length >= 2;
}

function parseUint(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function parsePriceShorthand(value: string | null): { min: number | null; max: number | null } {
  if (!value) return { min: null, max: null };
  const m = /^(\d+)?-(\d+)?$/.exec(value.trim());
  if (!m) return { min: null, max: null };
  const min = m[1] ? Number(m[1]) : null;
  const max = m[2] ? Number(m[2]) : null;
  return {
    min: min != null && Number.isFinite(min) && min >= 0 ? min : null,
    max: max != null && Number.isFinite(max) && max >= 0 ? max : null,
  };
}

function parseBool(value: string | null): boolean | null {
  if (value == null) return null;
  const v = value.toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse query params into a typed, validated `BrowseFilters` object.
 * Always returns a complete object — invalid values fall back to defaults.
 */
export function parseFilters(src: ParamSource): BrowseFilters {
  const typeRaw = getString(src, 'type')?.toLowerCase() ?? null;
  const type: ListingType =
    typeRaw && VALID_TYPES.has(typeRaw as ListingType)
      ? (typeRaw as ListingType)
      : DEFAULT_FILTERS.type;

  const sortRaw = getString(src, 'sort')?.toLowerCase() ?? null;
  const sort: SortKey =
    sortRaw && VALID_SORTS.has(sortRaw as SortKey)
      ? (sortRaw as SortKey)
      : DEFAULT_FILTERS.sort;

  const recentRaw = getString(src, 'recent')?.toLowerCase() ?? null;
  const recent: RecentWindow | null =
    recentRaw && VALID_RECENT.has(recentRaw as RecentWindow)
      ? (recentRaw as RecentWindow)
      : null;

  const cityRaw = getString(src, 'city')?.toLowerCase() ?? null;
  const city =
    cityRaw && (isCitySlug(cityRaw) || isKnownCitySlug(cityRaw)) ? cityRaw : null;

  const cities = parseCsv(getString(src, 'cities'), isKnownCitySlug);
  const provinces = parseCsv(getString(src, 'provinces'), isKnownProvinceSlug);
  const neighborhoods = parseCsv(getString(src, 'neighborhoods'), isNeighborhoodSlug);

  const verified = parseBool(getString(src, 'verified'));
  const hasPhoto = parseBool(getString(src, 'has-photo'));
  const urgent = parseBool(getString(src, 'urgent'));

  const priceShort = parsePriceShorthand(getString(src, 'price'));
  const priceMin = parseUint(getString(src, 'priceMin')) ?? priceShort.min;
  const priceMax = parseUint(getString(src, 'priceMax')) ?? priceShort.max;

  const q = getString(src, 'q')?.trim() || null;
  const statusRaw = getString(src, 'status')?.trim().toLowerCase() || null;
  const status =
    statusRaw && !DEAL_TYPE_VALUES.has(statusRaw) ? statusRaw : null;

  const attributes: Record<string, string> = {};

  const dealType =
    getString(src, 'dealType')?.trim().toLowerCase() ||
    (statusRaw && DEAL_TYPE_VALUES.has(statusRaw) ? statusRaw : null);
  if (dealType) attributes.dealType = dealType;

  const iterateKeys = (keys: string[]) => {
    for (const key of keys) {
      if (RESERVED_BROWSE_PARAMS.has(key)) continue;
      const raw = getString(src, key);
      if (!raw) continue;
      if (RANGE_PARAM_MAP[key]) {
        Object.assign(attributes, parseRangeShorthand(key, raw));
      } else {
        attributes[key] = raw.trim();
      }
    }
  };

  if (src instanceof URLSearchParams) {
    iterateKeys(Array.from(src.keys()));
  } else {
    iterateKeys(Object.keys(src));
  }

  for (const [key, val] of Object.entries(attributes)) {
    if (!val) delete attributes[key];
  }

  return {
    type,
    q,
    status,
    city,
    cities,
    provinces,
    neighborhoods,
    priceMin,
    priceMax,
    verified,
    hasPhoto,
    urgent,
    recent,
    sort,
    attributes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Serializer (single source of truth for query construction)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialize filters back to a `URLSearchParams`. Inverse of `parseFilters`.
 * Empty / default values are omitted to keep URLs clean and SEO-stable.
 *
 * Output ordering is deterministic for cache-friendly canonical URLs.
 */
export function serializeFilters(filters?: Partial<BrowseFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (!filters) return params;

  // Identity / scope
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.q) params.set('q', filters.q);

  // Geo
  if (filters.cities && filters.cities.length > 0) {
    params.set('cities', filters.cities.join(','));
  } else if (filters.city) {
    // back-compat single-city
    params.set('cities', filters.city);
  }
  if (filters.provinces && filters.provinces.length > 0) {
    params.set('provinces', filters.provinces.join(','));
  }
  if (filters.neighborhoods && filters.neighborhoods.length > 0) {
    params.set('neighborhoods', filters.neighborhoods.join(','));
  }

  // Money
  if (filters.priceMin != null || filters.priceMax != null) {
    const min = filters.priceMin != null ? String(filters.priceMin) : '';
    const max = filters.priceMax != null ? String(filters.priceMax) : '';
    params.set('price', `${min}-${max}`);
  }

  // Booleans (only set when explicitly true; absence == null)
  if (filters.verified === true) params.set('verified', 'true');
  if (filters.hasPhoto === true) params.set('has-photo', 'true');
  if (filters.urgent === true) params.set('urgent', 'true');

  // Recency
  if (filters.recent) params.set('recent', filters.recent);

  // Sort (omit default)
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);

  // Status (request lifecycle — not deal type)
  if (filters.status) params.set('status', filters.status);

  if (filters.attributes) {
    const rangeEmitted = new Set<string>();
    for (const [key, val] of Object.entries(filters.attributes)) {
      if (!val) continue;
      for (const [rangeParam, map] of Object.entries(RANGE_PARAM_MAP)) {
        if (key === map.minKey || key === map.maxKey) {
          if (rangeEmitted.has(rangeParam)) continue;
          const min = filters.attributes[map.minKey];
          const max = filters.attributes[map.maxKey];
          if (min || max) {
            params.set(rangeParam, `${min ?? ''}-${max ?? ''}`);
            rangeEmitted.add(rangeParam);
          }
          continue;
        }
      }
      if (!Object.values(RANGE_PARAM_MAP).some((m) => m.minKey === key || m.maxKey === key)) {
        params.set(key, val);
      }
    }
  }

  return params;
}

/** Convenience: serialize and stringify, including leading "?" or empty string. */
export function serializeFiltersString(filters?: Partial<BrowseFilters>): string {
  const qs = serializeFilters(filters).toString();
  return qs ? `?${qs}` : '';
}

export function hasActiveFilters(f: BrowseFilters): boolean {
  return countQueryFilters(f) > 0 || f.type !== 'all';
}

/** Count filters stored in query string (excludes path-based category/city). */
export function countQueryFilters(f: BrowseFilters): number {
  let n = 0;
  if (f.q) n++;
  if (f.status) n++;
  if (f.priceMin != null || f.priceMax != null) n++;
  if (f.verified === true) n++;
  if (f.hasPhoto === true) n++;
  if (f.urgent === true) n++;
  if (f.recent) n++;
  if (f.sort !== 'newest') n++;
  if (f.type !== 'all') n++;
  if (f.cities.length > 0) n++;
  if (f.provinces.length > 0) n++;
  if (f.neighborhoods.length > 0) n++;
  n += Object.keys(f.attributes).length;
  return n;
}

export function getAttribute(
  filters: BrowseFilters,
  key: string
): string | null {
  return filters.attributes[key] ?? null;
}

export function patchAttributes(
  filters: BrowseFilters,
  patch: Record<string, string | null | undefined>
): BrowseFilters {
  const next = { ...filters.attributes };
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') delete next[k];
    else next[k] = v;
  }
  return { ...filters, attributes: next };
}
