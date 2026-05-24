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

import { isCitySlug, isProvinceSlug } from '@/config/locations';
import { isKnownCitySlug } from '@/lib/search/city-slugs';

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

  priceMin: number | null;
  priceMax: number | null;

  verified: boolean | null;
  hasPhoto: boolean | null;
  urgent: boolean | null;

  recent: RecentWindow | null;
  sort: SortKey;
}

export const DEFAULT_FILTERS: BrowseFilters = {
  type: 'all',
  q: null,
  status: null,
  city: null,
  cities: [],
  provinces: [],
  priceMin: null,
  priceMax: null,
  verified: null,
  hasPhoto: null,
  urgent: null,
  recent: null,
  sort: 'newest',
};

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
  const provinces = parseCsv(getString(src, 'provinces'), isProvinceSlug);

  const verified = parseBool(getString(src, 'verified'));
  const hasPhoto = parseBool(getString(src, 'has-photo'));
  const urgent = parseBool(getString(src, 'urgent'));

  const priceShort = parsePriceShorthand(getString(src, 'price'));
  const priceMin = parseUint(getString(src, 'priceMin')) ?? priceShort.min;
  const priceMax = parseUint(getString(src, 'priceMax')) ?? priceShort.max;

  const q = getString(src, 'q')?.trim() || null;
  const status = getString(src, 'status')?.trim().toLowerCase() || null;

  return {
    type,
    q,
    status,
    city,
    cities,
    provinces,
    priceMin,
    priceMax,
    verified,
    hasPhoto,
    urgent,
    recent,
    sort,
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

  // Status (free-form)
  if (filters.status) params.set('status', filters.status);

  return params;
}

/** Convenience: serialize and stringify, including leading "?" or empty string. */
export function serializeFiltersString(filters?: Partial<BrowseFilters>): string {
  const qs = serializeFilters(filters).toString();
  return qs ? `?${qs}` : '';
}

export function hasActiveFilters(f: BrowseFilters): boolean {
  return (
    f.type !== 'all' ||
    f.q != null ||
    f.status != null ||
    f.city != null ||
    f.cities.length > 0 ||
    f.provinces.length > 0 ||
    f.priceMin != null ||
    f.priceMax != null ||
    f.verified != null ||
    f.hasPhoto != null ||
    f.urgent != null ||
    f.recent != null ||
    f.sort !== 'newest'
  );
}
