/**
 * Canonical browse URLs for category navigation (path-based, not ?category=).
 */
import { getCategoryPath, legacyValueToSlug } from '@/config/categories';
import {
  getOccupationPath,
  isPickableOccupationSlug,
} from '@/config/business-occupations';
import {
  getOnlineStorePath,
  isPickableOnlineStoreSlug,
} from '@/config/online-stores';
import {
  getBrowseUrl,
  type BrowseListingType,
} from '@/lib/search/browse-entry-url';
import { browseListingTypeFromPath } from '@/lib/search/browse-path';

export interface CategoryNavNode {
  value: string;
  id: string;
  canonicalSlug?: string;
}

/** Resolve a mega-menu / legacy value to a canonical category slug. */
export function resolveMegaMenuCategorySlug(
  category: CategoryNavNode
): string | null {
  return (
    legacyValueToSlug(category.value) ??
    (category.canonicalSlug ? legacyValueToSlug(category.canonicalSlug) : null) ??
    legacyValueToSlug(category.id) ??
    null
  );
}

export function resolveCategorySlugFromLegacy(
  legacyValue: string | null | undefined
): string | null {
  if (!legacyValue) return null;
  return legacyValueToSlug(legacyValue);
}

/** Build `/n|b/{loc}/{category}` (or nested) with saved location scope. */
export function getBrowseUrlForCategorySlug(
  categorySlug: string,
  opts: {
    type?: BrowseListingType;
    citySlug?: string;
    q?: string;
  } = {}
): string {
  const type = opts.type ?? 'need';
  const slug = resolveCategorySlugFromLegacy(categorySlug) ?? categorySlug;

  if (!slug) {
    return getBrowseUrl({ type, citySlug: opts.citySlug, q: opts.q });
  }

  if (type === 'business' && isPickableOnlineStoreSlug(slug)) {
    const storePath = getOnlineStorePath(slug);
    const leaf = storePath[storePath.length - 1];
    if (leaf && storePath.length >= 2) {
      const parent = storePath[storePath.length - 2]!;
      return getBrowseUrl({
        type,
        parentCategorySlug: parent.slug,
        categorySlug: leaf.slug,
        citySlug: opts.citySlug,
        q: opts.q,
      });
    }
    return getBrowseUrl({ type, categorySlug: slug, citySlug: opts.citySlug, q: opts.q });
  }

  if (type === 'business' && isPickableOccupationSlug(slug)) {
    const occPath = getOccupationPath(slug);
    const leaf = occPath[occPath.length - 1];
    if (leaf && occPath.length >= 2) {
      const parent = occPath[occPath.length - 2]!;
      return getBrowseUrl({
        type,
        parentCategorySlug: parent.slug,
        categorySlug: leaf.slug,
        citySlug: opts.citySlug,
        q: opts.q,
      });
    }
    return getBrowseUrl({ type, categorySlug: slug, citySlug: opts.citySlug, q: opts.q });
  }

  const path = getCategoryPath(slug);
  const leaf = path[path.length - 1];

  if (leaf && leaf.depth === 2 && path.length >= 2) {
    const parent = path[path.length - 2]!;
    return getBrowseUrl({
      type,
      parentCategorySlug: parent.slug,
      categorySlug: leaf.slug,
      citySlug: opts.citySlug,
      q: opts.q,
    });
  }

  return getBrowseUrl({
    type,
    categorySlug: slug,
    citySlug: opts.citySlug,
    q: opts.q,
  });
}

export function getCategoryBrowseUrl(
  category: CategoryNavNode,
  opts: {
    type?: BrowseListingType;
    citySlug?: string;
    q?: string;
  } = {}
): string {
  const slug = resolveMegaMenuCategorySlug(category);
  if (!slug) {
    return getBrowseUrl({ type: opts.type ?? 'need', citySlug: opts.citySlug, q: opts.q });
  }
  return getBrowseUrlForCategorySlug(slug, opts);
}

/** @deprecated Use getCategoryBrowseUrl — kept for imports during migration. */
export function getCategoryBrowseHref(
  category: CategoryNavNode,
  pathname?: string,
  searchParams?: URLSearchParams
): string {
  const type = pathname
    ? browseListingTypeFromPath(pathname, searchParams)
    : 'need';
  return getCategoryBrowseUrl(category, { type });
}
