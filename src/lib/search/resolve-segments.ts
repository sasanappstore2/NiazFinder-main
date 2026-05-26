/**
 * Resolve `/s/{location}/{...segments}` URL segments into a typed search context.
 *
 * Accepts the location slug AND the catch-all segments array from Next.js dynamic
 * routing and deterministically classifies them as one of:
 *
 *   - { kind: 'invalid-location' }                  → location not recognised
 *   - { kind: 'all', location }                     → /s/{loc} (no category)
 *   - { kind: 'category', location, category }      → /s/{loc}/{cat}
 *   - { kind: 'parent-child', location, parent, category } → /s/{loc}/{parent}/{cat}
 *   - { kind: 'invalid-segments', location, raw }   → unknown shape
 *
 * Resolution rules (single segment past location):
 *   - Must be a canonical category slug → 'category'.
 *
 * Resolution rules (two segments past location):
 *   - First MUST be a category slug AND second MUST be its direct child → 'parent-child'.
 *   - Otherwise: try second as a leaf category alone (graceful degradation), else invalid.
 *
 * More than two segments past location → invalid (we don't expose deeper paths).
 */

import {
  getCategoryBySlug,
  type CanonicalCategory,
} from '@/config/categories';
import {
  COUNTRY_SLUG,
  getCityBySlug,
  isCitySlug,
  isCountryLocation,
  type CanonicalCity,
} from '@/config/locations';
import type { BrowseMarket } from '@/config/market-routes';
import { canonicalMarketPath } from '@/config/market-routes';

export type SearchLocation =
  | { kind: 'country'; slug: typeof COUNTRY_SLUG }
  | { kind: 'city'; city: CanonicalCity };

export type SearchContext =
  | { kind: 'invalid-location'; raw: string }
  | { kind: 'all'; location: SearchLocation }
  | { kind: 'category'; location: SearchLocation; category: CanonicalCategory }
  | {
      kind: 'parent-child';
      location: SearchLocation;
      parent: CanonicalCategory;
      category: CanonicalCategory;
    }
  | { kind: 'invalid-segments'; location: SearchLocation; raw: readonly string[] };

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

/** Resolve full `/s/{loc}/{...segments}` shape. */
export function resolveSearchSegments(
  rawLocation: string,
  rawSegments: readonly string[] | undefined
): SearchContext {
  const location = resolveLocation(rawLocation);
  if (!location) return { kind: 'invalid-location', raw: rawLocation };

  if (!rawSegments || rawSegments.length === 0) {
    return { kind: 'all', location };
  }

  if (rawSegments.length > 2) {
    return { kind: 'invalid-segments', location, raw: rawSegments };
  }

  const segments = rawSegments.map((s) => s.toLowerCase());

  if (segments.length === 1) {
    const cat = getCategoryBySlug(segments[0]);
    if (cat) return { kind: 'category', location, category: cat };
    return { kind: 'invalid-segments', location, raw: rawSegments };
  }

  // Two segments → parent/child
  const parent = getCategoryBySlug(segments[0]);
  const child = getCategoryBySlug(segments[1]);
  if (parent && child && child.parentSlug === parent.slug) {
    return { kind: 'parent-child', location, parent, category: child };
  }

  // Graceful fallback: child alone as a flat category if it exists
  if (child) return { kind: 'category', location, category: child };

  return { kind: 'invalid-segments', location, raw: rawSegments };
}

/**
 * Convenience: extract the active category from a SearchContext (if any).
 * Returns null for 'all'/invalid contexts.
 */
export function activeCategory(ctx: SearchContext): CanonicalCategory | null {
  if (ctx.kind === 'category' || ctx.kind === 'parent-child') return ctx.category;
  return null;
}

/** Convenience: pull the city slug if the location is a specific city. */
export function activeCitySlug(ctx: SearchContext): string | null {
  if (ctx.kind === 'invalid-location') return null;
  const loc = (ctx as Exclude<SearchContext, { kind: 'invalid-location' }>).location;
  return loc.kind === 'city' ? loc.city.slug : null;
}

/**
 * Generate the canonical URL for a resolved context (no query string).
 * Useful for `<link rel="canonical">` tags.
 */
export function canonicalPath(ctx: SearchContext, market: BrowseMarket = 'need'): string {
  if (ctx.kind === 'invalid-location' || ctx.kind === 'invalid-segments') {
    return canonicalMarketPath(market, COUNTRY_SLUG);
  }
  const locSlug = ctx.location.kind === 'country' ? COUNTRY_SLUG : ctx.location.city.slug;
  if (ctx.kind === 'all') return canonicalMarketPath(market, locSlug);
  if (ctx.kind === 'category') {
    return canonicalMarketPath(market, locSlug, [ctx.category.slug]);
  }
  return canonicalMarketPath(market, locSlug, [ctx.parent.slug, ctx.category.slug]);
}
