import {
  CANONICAL_CATEGORIES,
  getCategoryPath,
  isAncestorCategory,
  legacyValueToSlug,
} from '@/config/categories';

/** Slugs to match against business categorySlugs (self + ancestors + children). */
export function expandCategorySlugsForMatch(dbSlug: string): string[] {
  const canonical = legacyValueToSlug(dbSlug) ?? dbSlug;
  const slugs = new Set<string>([canonical]);

  const path = getCategoryPath(canonical);
  for (const c of path) slugs.add(c.slug);

  for (const cat of CANONICAL_CATEGORIES) {
    if (isAncestorCategory(canonical, cat.slug) || cat.slug === canonical) {
      slugs.add(cat.slug);
    }
  }

  return [...slugs];
}
