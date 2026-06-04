/**
 * Shared browse page titles (H1 + document title + description) for SEO consistency.
 */
import {
  type SearchContext,
} from '@/lib/search/resolve-segments';
import {
  resolveLocationScope,
  scopeIsActive,
  scopeLabelForHeading,
  type LocationScope,
} from '@/lib/search/location-scope';
import { parseBrowsePath, type BrowsePathContext } from '@/lib/search/browse-path';
import { getCityBySlug, COUNTRY_SLUG } from '@/config/locations';
import type { BrowseListingType } from '@/lib/search/browse-entry-url';

export interface BrowsePageTitles {
  h1: string;
  title: string;
  description: string;
  locationLabel: string;
  categoryTitle: string | null;
}

export const BROWSE_PAGE_H1_MAX_LENGTH = 160;

/** Truncate visible browse H1; full string kept for SEO metadata. */
export function truncateBrowsePageH1(
  text: string,
  max = BROWSE_PAGE_H1_MAX_LENGTH
): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
}

export function resolveBrowseLocationLabel(
  pathCtx: BrowsePathContext,
  scope: LocationScope
): string {
  if (scopeIsActive(scope)) return scopeLabelForHeading(scope);
  if (pathCtx.citySlug) {
    return getCityBySlug(pathCtx.citySlug)?.title ?? pathCtx.citySlug;
  }
  if (pathCtx.pathLocation === COUNTRY_SLUG) {
    return 'سراسر ایران';
  }
  return pathCtx.pathLocation;
}

function locationLabelFromScope(
  ctx: SearchContext,
  scope: LocationScope
): string {
  if (scopeIsActive(scope)) return scopeLabelForHeading(scope);
  if (ctx.kind === 'invalid-location' || ctx.kind === 'invalid-segments') {
    return 'سراسر ایران';
  }
  const loc = ctx.location;
  return loc.kind === 'country' ? 'سراسر ایران' : loc.city.title;
}

export function buildBrowsePageH1(opts: {
  listingType: BrowseListingType;
  locationLabel: string;
  categoryTitle?: string | null;
  parentCategoryTitle?: string | null;
}): string {
  const { listingType, locationLabel, categoryTitle, parentCategoryTitle } = opts;
  const isBusiness = listingType === 'business';

  if (categoryTitle && parentCategoryTitle) {
    return isBusiness
      ? `کسب‌وکارهای ${categoryTitle} در ${locationLabel}`
      : `نیازهای ${categoryTitle} در ${locationLabel}`;
  }

  if (categoryTitle) {
    return isBusiness
      ? `کسب‌وکارهای ${categoryTitle} در ${locationLabel}`
      : `نیازهای ${categoryTitle} در ${locationLabel}`;
  }

  return isBusiness ? `کسب‌وکارها در ${locationLabel}` : `نیازها در ${locationLabel}`;
}

function buildBrowseDescription(opts: {
  listingType: BrowseListingType;
  locationLabel: string;
  categoryTitle: string | null;
  siteName: string;
}): string {
  const { listingType, locationLabel, categoryTitle, siteName } = opts;
  const where =
    locationLabel === 'سراسر ایران' ? 'سراسر ایران' : locationLabel;

  if (listingType === 'business') {
    return categoryTitle != null
      ? `کسب‌وکارهای ${categoryTitle} در ${where} در ${siteName}.`
      : `کسب‌وکارها در ${where} در ${siteName}.`;
  }

  return categoryTitle != null
    ? `نیازها و کسب‌وکارهای ${categoryTitle} در ${where} در ${siteName}.`
    : `جدیدترین نیازها و کسب‌وکارها در ${where} در ${siteName}.`;
}

export function buildBrowsePageTitlesFromContext(
  ctx: SearchContext,
  siteName: string,
  listingType: BrowseListingType = 'need',
  scope?: LocationScope
): BrowsePageTitles {
  if (ctx.kind === 'invalid-location' || ctx.kind === 'invalid-segments') {
    const h1 = listingType === 'business' ? 'کسب‌وکارها' : 'نیازها';
    return {
      h1,
      title: `جستجو | ${siteName}`,
      description: `جستجو در ${siteName}.`,
      locationLabel: 'سراسر ایران',
      categoryTitle: null,
    };
  }

  const locationLabel = scope
    ? locationLabelFromScope(ctx, scope)
    : ctx.location.kind === 'country'
      ? 'سراسر ایران'
      : ctx.location.city.title;

  let categoryTitle: string | null = null;
  let parentCategoryTitle: string | null = null;

  if (ctx.kind === 'category') {
    categoryTitle = ctx.category.title;
  } else if (ctx.kind === 'parent-child') {
    categoryTitle = ctx.category.title;
    parentCategoryTitle = ctx.parent.title;
  }

  const description = buildBrowseDescription({
    listingType,
    locationLabel,
    categoryTitle,
    siteName,
  });

  const h1 = buildBrowsePageH1({
    listingType,
    locationLabel,
    categoryTitle,
    parentCategoryTitle,
  });

  return {
    h1,
    title: `${h1} | ${siteName}`,
    description,
    locationLabel,
    categoryTitle,
  };
}

/** Client-side titles from pathname + optional scope (URL or cookie). */
export function buildBrowsePageTitlesFromPath(
  pathname: string,
  searchParams: URLSearchParams,
  siteName: string,
  listingType: BrowseListingType
): BrowsePageTitles {
  const scope = resolveLocationScope(pathname, searchParams);
  const pathCtx = parseBrowsePath(pathname);
  const locationLabel = resolveBrowseLocationLabel(pathCtx, scope);
  const categoryTitle = pathCtx.categoryTitle ?? null;

  const h1 = buildBrowsePageH1({
    listingType,
    locationLabel,
    categoryTitle,
    parentCategoryTitle: pathCtx.parentCategoryTitle ?? null,
  });

  const description = buildBrowseDescription({
    listingType,
    locationLabel,
    categoryTitle,
    siteName,
  });

  return {
    h1,
    title: `${h1} | ${siteName}`,
    description,
    locationLabel,
    categoryTitle,
  };
}
