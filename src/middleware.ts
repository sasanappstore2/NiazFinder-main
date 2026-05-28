import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBrowseUrlForCategorySlug } from '@/lib/search/category-browse-url';
import { isMarketplaceLocationSegment } from '@/config/market-routes';
import { getBrowseMarketFromPathname } from '@/config/market-routes';

/**
 * Legacy `?category=` on marketplace paths → canonical path segments.
 * Legacy `/n/{slug}/{id}` detail → `/v/{slug}/{id}` when not a browse location.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const nTwo = pathname.match(/^\/n\/([^/]+)\/([^/]+)$/);
  if (nTwo && !isMarketplaceLocationSegment(nTwo[1])) {
    return NextResponse.redirect(
      new URL(`/v/${nTwo[1]}/${nTwo[2]}${request.nextUrl.search}`, request.url),
      301
    );
  }

  const nOne = pathname.match(/^\/n\/([^/]+)$/);
  if (nOne && !isMarketplaceLocationSegment(nOne[1])) {
    return NextResponse.redirect(
      new URL(`/v/${nOne[1]}${request.nextUrl.search}`, request.url),
      301
    );
  }

  const isMarketPath =
    pathname.startsWith('/n/') ||
    pathname.startsWith('/b/') ||
    pathname.startsWith('/s/');

  if (!isMarketPath) {
    return NextResponse.next();
  }

  const marketPathParts = pathname.replace(/^\/(n|b|s)\/?/, '').split('/').filter(Boolean);
  const firstSegment = marketPathParts[0]?.toLowerCase();
  // /b/{profileSlug}, /b/{profileSlug}/p/... — not marketplace browse; do not rewrite ?category=
  if (firstSegment && !isMarketplaceLocationSegment(firstSegment)) {
    return NextResponse.next();
  }

  const legacyCategory = searchParams.get('category');
  if (!legacyCategory) {
    return NextResponse.next();
  }

  const market = getBrowseMarketFromPathname(pathname) ?? 'need';
  const parts = pathname.replace(/^\/(n|b|s)\/?/, '').split('/').filter(Boolean);
  const pathLoc = parts[0] ?? 'iran';
  const citySlug = pathLoc !== 'iran' ? pathLoc : undefined;

  const canonicalPath = getBrowseUrlForCategorySlug(legacyCategory, {
    citySlug,
    type: market === 'business' ? 'business' : 'need',
  });
  const target = new URL(canonicalPath, request.url);

  const merged = new URLSearchParams(searchParams);
  merged.delete('category');
  for (const [key, value] of merged) {
    if (!target.searchParams.has(key)) {
      target.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(target, 301);
}

export const config = {
  matcher: ['/s/:path*', '/n/:path*', '/b/:path*'],
};
