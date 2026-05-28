/**
 * Client-safe resolver for `/b/{location}/{...segments}` (no canonical URL helpers).
 */
import {
  getCategoryBySlug,
  type CanonicalCategory,
} from '@/config/categories';
import {
  getOccupationBySlug,
  getOccupationTitle,
  isAncestorOccupation,
  isPickableOccupationSlug,
} from '@/config/business-occupations';
import {
  getOnlineStoreBySlug,
  getOnlineStoreTitle,
  isAncestorOnlineStore,
  isPickableOnlineStoreSlug,
} from '@/config/online-stores';
import { getBusinessCategorySeoSegment } from '@/lib/business/business-category';
import { resolveLocation, type SearchLocation } from '@/lib/search/resolve-location';

export type BusinessSegmentKind = 'occupation' | 'online-store' | 'need';

export type BusinessSearchContext =
  | { kind: 'invalid-location'; raw: string }
  | { kind: 'all'; location: SearchLocation }
  | {
      kind: 'profile-category';
      location: SearchLocation;
      categorySlug: string;
      categoryTitle: string;
      segmentKind: 'occupation' | 'online-store';
    }
  | {
      kind: 'need-category';
      location: SearchLocation;
      category: CanonicalCategory;
      categorySlug: string;
      categoryTitle: string;
    }
  | {
      kind: 'parent-child';
      location: SearchLocation;
      parentSlug: string;
      categorySlug: string;
      parentTitle: string;
      categoryTitle: string;
      segmentKind: BusinessSegmentKind;
    }
  | { kind: 'invalid-segments'; location: SearchLocation; raw: readonly string[] };

function profileSegment(slug: string): {
  kind: 'profile-category';
  categorySlug: string;
  categoryTitle: string;
  segmentKind: 'occupation' | 'online-store';
} | null {
  if (isPickableOnlineStoreSlug(slug)) {
    return {
      kind: 'profile-category',
      categorySlug: slug,
      categoryTitle: getBusinessCategorySeoSegment(slug),
      segmentKind: 'online-store',
    };
  }
  if (isPickableOccupationSlug(slug)) {
    return {
      kind: 'profile-category',
      categorySlug: slug,
      categoryTitle: getBusinessCategorySeoSegment(slug),
      segmentKind: 'occupation',
    };
  }
  return null;
}

export function resolveBusinessSegments(
  rawLocation: string,
  rawSegments: readonly string[] | undefined
): BusinessSearchContext {
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
    const slug = segments[0]!;
    const profile = profileSegment(slug);
    if (profile) return { ...profile, location };

    const needCat = getCategoryBySlug(slug);
    if (needCat) {
      return {
        kind: 'need-category',
        location,
        category: needCat,
        categorySlug: needCat.slug,
        categoryTitle: needCat.title,
      };
    }

    return { kind: 'invalid-segments', location, raw: rawSegments };
  }

  const [parentRaw, childRaw] = segments as [string, string];

  if (isAncestorOccupation(parentRaw, childRaw) && isPickableOccupationSlug(childRaw)) {
    return {
      kind: 'parent-child',
      location,
      parentSlug: parentRaw,
      categorySlug: childRaw,
      parentTitle: getOccupationBySlug(parentRaw)?.title ?? parentRaw,
      categoryTitle: getOccupationTitle(childRaw),
      segmentKind: 'occupation',
    };
  }

  if (isAncestorOnlineStore(parentRaw, childRaw) && isPickableOnlineStoreSlug(childRaw)) {
    return {
      kind: 'parent-child',
      location,
      parentSlug: parentRaw,
      categorySlug: childRaw,
      parentTitle: getOnlineStoreBySlug(parentRaw)?.title ?? parentRaw,
      categoryTitle: getOnlineStoreTitle(childRaw),
      segmentKind: 'online-store',
    };
  }

  const parentNeed = getCategoryBySlug(parentRaw);
  const childNeed = getCategoryBySlug(childRaw);
  if (parentNeed && childNeed && childNeed.parentSlug === parentNeed.slug) {
    return {
      kind: 'parent-child',
      location,
      parentSlug: parentNeed.slug,
      categorySlug: childNeed.slug,
      parentTitle: parentNeed.title,
      categoryTitle: childNeed.title,
      segmentKind: 'need',
    };
  }

  const profileChild = profileSegment(childRaw);
  if (profileChild) {
    return { ...profileChild, location };
  }

  const needChild = getCategoryBySlug(childRaw);
  if (needChild) {
    return {
      kind: 'need-category',
      location,
      category: needChild,
      categorySlug: needChild.slug,
      categoryTitle: needChild.title,
    };
  }

  return { kind: 'invalid-segments', location, raw: rawSegments };
}

export function activeBusinessCategorySlug(ctx: BusinessSearchContext): string | null {
  if (ctx.kind === 'profile-category' || ctx.kind === 'need-category') {
    return ctx.categorySlug;
  }
  if (ctx.kind === 'parent-child') return ctx.categorySlug;
  return null;
}

export function activeBusinessCategoryTitle(ctx: BusinessSearchContext): string | null {
  if (
    ctx.kind === 'profile-category' ||
    ctx.kind === 'need-category' ||
    ctx.kind === 'parent-child'
  ) {
    return ctx.categoryTitle;
  }
  return null;
}
