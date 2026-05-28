/**
 * Resolve browse `category` query/path segment → Prisma filters on `categorySlugs`.
 */
import { isCategorySlug } from '@/config/categories';
import {
  isOccupationSlug,
  isPickableOccupationSlug,
  resolveOccupationSlug,
} from '@/config/business-occupations';
import {
  isOnlineStoreSlug,
  isPickableOnlineStoreSlug,
} from '@/config/online-stores';
import { expandOccupationsForNeedMatch } from '@/config/need-to-occupation-map';
import type { Prisma } from '@prisma/client';

export type BrowseCategoryFilter =
  | { kind: 'none' }
  | { kind: 'single'; slug: string }
  | { kind: 'any-of'; slugs: string[] };

/** Classify segment for dispatcher / breadcrumbs. */
export type BrowseCategorySegmentKind = 'profileCategory' | 'needCategory' | null;

export function browseCategorySegmentKind(
  categorySlug: string | null | undefined
): BrowseCategorySegmentKind {
  if (!categorySlug) return null;
  if (isPickableOccupationSlug(categorySlug) || isPickableOnlineStoreSlug(categorySlug)) {
    return 'profileCategory';
  }
  if (isCategorySlug(categorySlug)) return 'needCategory';
  if (isOccupationSlug(categorySlug) || isOnlineStoreSlug(categorySlug)) {
    return 'profileCategory';
  }
  return null;
}

/** JSON `contains` match for one slug inside `categorySlugs` array column. */
export function categorySlugContains(slug: string): Prisma.StringFilter {
  const normalized = resolveOccupationSlug(slug.trim());
  return { contains: `"${normalized}"` };
}

/**
 * Map URL/API category param to DB filter.
 * Priority: occupation / online-store → need category (expanded occupations).
 */
export function resolveBrowseCategoryFilter(
  categorySlug: string | null | undefined
): BrowseCategoryFilter {
  const raw = categorySlug?.trim().toLowerCase();
  if (!raw) return { kind: 'none' };

  if (isPickableOccupationSlug(raw) || isPickableOnlineStoreSlug(raw)) {
    return { kind: 'single', slug: raw };
  }

  if (isOccupationSlug(raw) || isOnlineStoreSlug(raw)) {
    return { kind: 'single', slug: raw };
  }

  if (isCategorySlug(raw)) {
    const slugs = expandOccupationsForNeedMatch(raw);
    if (slugs.length === 0) return { kind: 'none' };
    if (slugs.length === 1) return { kind: 'single', slug: slugs[0]! };
    return { kind: 'any-of', slugs };
  }

  return { kind: 'none' };
}

export function categoryFilterToPrismaWhere(
  filter: BrowseCategoryFilter
): Prisma.BusinessProfileWhereInput | undefined {
  if (filter.kind === 'none') return undefined;
  if (filter.kind === 'single') {
    return { categorySlugs: categorySlugContains(filter.slug) };
  }
  return {
    OR: filter.slugs.map((slug) => ({
      categorySlugs: categorySlugContains(slug),
    })),
  };
}
