/**
 * Marketplace URL prefixes: /n/ needs, /b/ businesses.
 */
import type { ListingType } from '@/lib/filters/parser';
import { COUNTRY_SLUG, isLocationSlug } from '@/config/locations';

export type BrowseMarket = 'need' | 'business';

export const MARKET_PREFIX: Record<BrowseMarket, string> = {
  need: 'n',
  business: 'b',
} as const;

export function marketFromListingType(type?: ListingType | null): BrowseMarket {
  return type === 'business' ? 'business' : 'need';
}

export function listingTypeFromMarket(market: BrowseMarket): ListingType {
  return market === 'business' ? 'business' : 'need';
}

export function getBrowseMarketFromPathname(pathname: string): BrowseMarket | null {
  if (pathname === '/n' || pathname.startsWith('/n/')) return 'need';
  if (pathname === '/b' || pathname.startsWith('/b/')) return 'business';
  if (pathname === '/s' || pathname.startsWith('/s/')) return null;
  return null;
}

/** First path segment after marketplace prefix (e.g. mashhad). */
export function parseMarketplacePath(pathname: string): {
  market: BrowseMarket;
  parts: string[];
} | null {
  const match = pathname.match(/^\/(n|b)(?:\/(.*))?$/);
  if (!match) return null;
  const market: BrowseMarket = match[1] === 'b' ? 'business' : 'need';
  const parts = (match[2] ?? '').split('/').filter(Boolean);
  return { market, parts };
}

export function isMarketplaceLocationSegment(segment: string): boolean {
  const s = segment.toLowerCase();
  return s === COUNTRY_SLUG || isLocationSlug(s);
}

export function marketplaceLocationPrefix(
  location: string | null | undefined,
  market: BrowseMarket
): string {
  const prefix = MARKET_PREFIX[market];
  if (!location) return `/${prefix}/${COUNTRY_SLUG}`;
  const slug = location.toLowerCase();
  return isLocationSlug(slug) ? `/${prefix}/${slug}` : `/${prefix}/${COUNTRY_SLUG}`;
}

export function canonicalMarketPath(
  market: BrowseMarket,
  locSlug: string,
  categorySegments: string[] = []
): string {
  const base = marketplaceLocationPrefix(locSlug, market);
  if (categorySegments.length === 0) return base;
  return `${base}/${categorySegments.map(encodeURIComponent).join('/')}`;
}
