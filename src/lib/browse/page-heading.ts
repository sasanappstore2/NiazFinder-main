/**
 * Shared browse page titles (H1 + document title + description) for SEO consistency.
 */
import {
  resolveSearchSegments,
  type SearchContext,
} from '@/lib/search/resolve-segments';
import {
  resolveLocationScope,
  scopeIsActive,
  scopeLabel,
  type LocationScope,
} from '@/lib/search/location-scope';
import { parseBrowsePath } from '@/lib/search/browse-path';
import { getBrowseMarketFromPathname } from '@/config/market-routes';
import { getCityBySlug, COUNTRY_SLUG } from '@/config/locations';
import type { BrowseListingType } from '@/lib/search/browse-entry-url';

export interface BrowsePageTitles {
  h1: string;
  title: string;
  description: string;
  locationLabel: string;
  categoryTitle: string | null;
}

function locationLabelFromScope(
  ctx: SearchContext,
  scope: LocationScope
): string {
  if (scopeIsActive(scope)) return scopeLabel(scope);
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
  let description: string;

  if (ctx.kind === 'all') {
    description =
      ctx.location.kind === 'country'
        ? `جدیدترین نیازها و کسب‌وکارها در سراسر ایران در ${siteName}.`
        : `جدیدترین نیازها و کسب‌وکارها در ${locationLabel} در ${siteName}.`;
  } else if (ctx.kind === 'category') {
    categoryTitle = ctx.category.title;
    description = `نیازها و کسب‌وکارهای ${ctx.category.title} در ${locationLabel} در ${siteName}.`;
  } else {
    categoryTitle = ctx.category.title;
    parentCategoryTitle = ctx.parent.title;
    description = `${ctx.category.title} در ${locationLabel} — زیرمجموعه ${ctx.parent.title} در ${siteName}.`;
  }

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
  const market = getBrowseMarketFromPathname(pathname);

  if (market === 'business' || listingType === 'business') {
    const locationLabel = scopeIsActive(scope)
      ? scopeLabel(scope)
      : pathCtx.citySlug
        ? (getCityBySlug(pathCtx.citySlug)?.title ?? pathCtx.citySlug)
        : pathCtx.pathLocation === COUNTRY_SLUG
          ? 'سراسر ایران'
          : pathCtx.pathLocation;

    const h1 = buildBrowsePageH1({
      listingType: 'business',
      locationLabel,
      categoryTitle: pathCtx.categoryTitle ?? null,
      parentCategoryTitle: pathCtx.parentCategoryTitle ?? null,
    });
    const description =
      pathCtx.categoryTitle != null
        ? `کسب‌وکارهای ${pathCtx.categoryTitle} در ${locationLabel} در ${siteName}.`
        : `کسب‌وکارها در ${locationLabel} در ${siteName}.`;

    return {
      h1,
      title: `${h1} | ${siteName}`,
      description,
      locationLabel,
      categoryTitle: pathCtx.categoryTitle ?? null,
    };
  }

  const parts = pathname.replace(/^\/s\/?/, '').split('/').filter(Boolean);
  const [rawLoc, ...segments] = parts;
  const ctx = resolveSearchSegments(rawLoc ?? 'iran', segments);
  const base = buildBrowsePageTitlesFromContext(ctx, siteName, listingType, scope);

  if (pathCtx.categoryTitle && !base.categoryTitle) {
    const h1 = buildBrowsePageH1({
      listingType,
      locationLabel: base.locationLabel,
      categoryTitle: pathCtx.categoryTitle,
      parentCategoryTitle: pathCtx.parentCategoryTitle ?? null,
    });
    return { ...base, h1, title: `${h1} | ${siteName}`, categoryTitle: pathCtx.categoryTitle };
  }

  return base;
}
