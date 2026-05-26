import { resolveSearchSegments } from '@/lib/search/resolve-segments';
import { COUNTRY_SLUG } from '@/config/locations';
import { getCategoryBySlug } from '@/config/categories';
import {
  type BrowseMarket,
  getBrowseMarketFromPathname,
  isMarketplaceLocationSegment,
  parseMarketplacePath,
  marketplaceLocationPrefix,
} from '@/config/market-routes';
import type { BrowseListingType } from '@/lib/search/browse-entry-url';

export interface BrowsePathContext {
  market?: BrowseMarket;
  pathLocation: string;
  citySlug?: string;
  categorySlug?: string;
  parentCategorySlug?: string;
  categoryTitle?: string;
  parentCategoryTitle?: string;
}

export function getBrowseMarket(pathname: string): BrowseMarket | null {
  return getBrowseMarketFromPathname(pathname);
}

/** Listing type for category links — respects /n/, /b/, and legacy /s/?type=. */
export function browseListingTypeFromPath(
  pathname: string,
  searchParams?: URLSearchParams
): BrowseListingType {
  const market = getBrowseMarketFromPathname(pathname);
  if (market === 'business') return 'business';
  if (market === 'need') return 'need';
  if (pathname.startsWith('/s/') && searchParams?.get('type') === 'business') {
    return 'business';
  }
  return 'need';
}

export function isBrowsePath(pathname: string): boolean {
  return (
    pathname === '/n' ||
    pathname.startsWith('/n/') ||
    pathname === '/b' ||
    pathname.startsWith('/b/') ||
    pathname === '/s' ||
    pathname.startsWith('/s/') ||
    pathname === '/browse' ||
    pathname.startsWith('/browse/')
  );
}

/** True when /b/{single} is a business profile (not iran/city browse root). */
export function isBusinessProfilePath(pathname: string): boolean {
  const parsed = parseMarketplacePath(pathname);
  if (!parsed || parsed.market !== 'business' || parsed.parts.length !== 1) {
    return false;
  }
  return !isMarketplaceLocationSegment(parsed.parts[0].toLowerCase());
}

function parseFromMarketPath(
  pathname: string,
  market: BrowseMarket
): BrowsePathContext {
  const parsed = parseMarketplacePath(pathname);
  if (!parsed || parsed.market !== market) {
    return { market, pathLocation: COUNTRY_SLUG };
  }

  const parts = parsed.parts;
  if (parts.length === 0) return { market, pathLocation: COUNTRY_SLUG };

  const [rawLoc, ...segments] = parts;
  const ctx = resolveSearchSegments(rawLoc, segments);

  if (ctx.kind === 'invalid-location') {
    return { market, pathLocation: COUNTRY_SLUG };
  }

  const pathLocation =
    ctx.location.kind === 'country' ? COUNTRY_SLUG : ctx.location.city.slug;
  const citySlug = ctx.location.kind === 'city' ? ctx.location.city.slug : undefined;

  if (ctx.kind === 'category') {
    return {
      market,
      pathLocation,
      citySlug,
      categorySlug: ctx.category.slug,
      categoryTitle: ctx.category.title,
    };
  }

  if (ctx.kind === 'parent-child') {
    return {
      market,
      pathLocation,
      citySlug,
      parentCategorySlug: ctx.parent.slug,
      categorySlug: ctx.category.slug,
      categoryTitle: ctx.category.title,
      parentCategoryTitle: ctx.parent.title,
    };
  }

  return { market, pathLocation, citySlug };
}

/** Extract category + location from /n/, /b/, or legacy /s/ pathname. */
export function parseBrowsePath(pathname: string): BrowsePathContext {
  const market = getBrowseMarketFromPathname(pathname);
  if (market) return parseFromMarketPath(pathname, market);

  if (pathname.startsWith('/s/')) {
    return parseFromMarketPath(pathname.replace(/^\/s/, '/n'), 'need');
  }

  return { pathLocation: COUNTRY_SLUG };
}

/** URL without category segments (keeps location + market prefix). */
export function pathWithoutCategory(pathname: string): string {
  const ctx = parseBrowsePath(pathname);
  const loc = ctx.pathLocation === COUNTRY_SLUG ? 'iran' : ctx.pathLocation;
  const market = ctx.market ?? 'need';
  return marketplaceLocationPrefix(loc, market);
}

export function getCategoryLabelFromPath(pathname: string): string | null {
  const ctx = parseBrowsePath(pathname);
  if (!ctx.categorySlug) return null;
  const cat = getCategoryBySlug(ctx.categorySlug);
  if (cat) return cat.title;
  if (ctx.parentCategoryTitle && ctx.categoryTitle) {
    return ctx.categoryTitle;
  }
  return ctx.categoryTitle ?? null;
}

export function getFilterRootFromPath(pathname: string): string | null {
  const ctx = parseBrowsePath(pathname);
  if (!ctx.categorySlug) return null;
  return ctx.parentCategorySlug ?? ctx.categorySlug;
}
