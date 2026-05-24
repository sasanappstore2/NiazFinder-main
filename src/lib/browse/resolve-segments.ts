/**
 * Resolve `/browse/...` URL segments into a typed context.
 *
 * Accepts the catch-all segments array from Next.js dynamic routing and
 * deterministically classifies them as one of:
 *   - none           → /browse
 *   - category       → /browse/{category}
 *   - city-category  → /browse/{city}/{category}    (city MUST be canonical)
 *   - parent-child   → /browse/{parent}/{category}  (parent MUST be parent of category)
 *   - invalid        → unknown shape
 *
 * Resolution rules (in order):
 *   1) If segments[0] is a canonical city slug → city/category (else fall through).
 *   2) If segments[0] + [1] are parent/child in the category tree → parent-child.
 *   3) Otherwise category alone (segments[0]); excess segments are ignored.
 */

import { getCategoryBySlug, isCategorySlug, type CanonicalCategory } from '@/config/categories';
import { getCityBySlug, isCitySlug, type CanonicalCity } from '@/config/locations';

export type BrowseContext =
  | { kind: 'none' }
  | { kind: 'category'; category: CanonicalCategory }
  | { kind: 'city-category'; city: CanonicalCity; category: CanonicalCategory }
  | { kind: 'parent-child'; parent: CanonicalCategory; category: CanonicalCategory }
  | { kind: 'invalid'; raw: readonly string[] };

export function resolveBrowseSegments(
  segments: readonly string[] | undefined
): BrowseContext {
  if (!segments || segments.length === 0) {
    return { kind: 'none' };
  }

  const [first, second] = segments.map((s) => s.toLowerCase());

  // 1) Single segment → category landing
  if (segments.length === 1) {
    const cat = getCategoryBySlug(first);
    if (cat) return { kind: 'category', category: cat };
    return { kind: 'invalid', raw: segments };
  }

  // 2) Two segments → city/category OR parent/child
  if (segments.length >= 2) {
    if (isCitySlug(first) && isCategorySlug(second)) {
      const city = getCityBySlug(first)!;
      const category = getCategoryBySlug(second)!;
      return { kind: 'city-category', city, category };
    }

    const parent = getCategoryBySlug(first);
    const child = getCategoryBySlug(second);
    if (parent && child && child.parentSlug === parent.slug) {
      return { kind: 'parent-child', parent, category: child };
    }

    // Fallback: try second segment as category alone
    if (child) return { kind: 'category', category: child };
    if (parent) return { kind: 'category', category: parent };
  }

  return { kind: 'invalid', raw: segments };
}
