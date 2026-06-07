import { CANONICAL_CATEGORIES, getDirectChildren, getCategoryPath } from '@/config/categories';

/** All pickable real-estate leaf category slugs (depth-2 under املاک). */
export function getRealEstateLeafSlugs(): string[] {
  return CANONICAL_CATEGORIES.filter((c) => {
    if (getCategoryPath(c.slug)[0]?.slug !== 'real-estate') return false;
    return getDirectChildren(c.slug).length === 0;
  }).map((c) => c.slug);
}

export const REAL_ESTATE_LEAF_SLUGS: readonly string[] = getRealEstateLeafSlugs();
