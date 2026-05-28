/**
 * Business marketplace segment resolver + canonical paths (server-oriented barrel).
 * Client code should import from `@/lib/search/business-segments-resolve` when possible.
 */
import { COUNTRY_SLUG } from '@/config/locations';
import type { BrowseMarket } from '@/config/market-routes';
import { canonicalMarketPath } from '@/config/market-routes';
import type { BusinessSearchContext } from '@/lib/search/business-segments-resolve';

export type {
  BusinessSegmentKind,
  BusinessSearchContext,
} from '@/lib/search/business-segments-resolve';

export {
  resolveBusinessSegments,
  activeBusinessCategorySlug,
  activeBusinessCategoryTitle,
} from '@/lib/search/business-segments-resolve';

export function canonicalBusinessPath(
  ctx: BusinessSearchContext,
  market: BrowseMarket = 'business'
): string {
  if (ctx.kind === 'invalid-location' || ctx.kind === 'invalid-segments') {
    return canonicalMarketPath(market, COUNTRY_SLUG);
  }
  const locSlug = ctx.location.kind === 'country' ? COUNTRY_SLUG : ctx.location.city.slug;
  if (ctx.kind === 'all') return canonicalMarketPath(market, locSlug);

  if (ctx.kind === 'profile-category' || ctx.kind === 'need-category') {
    return canonicalMarketPath(market, locSlug, [ctx.categorySlug]);
  }

  return canonicalMarketPath(market, locSlug, [ctx.parentSlug, ctx.categorySlug]);
}
