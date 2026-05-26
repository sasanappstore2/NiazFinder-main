import type { BrowseMarket } from '@/config/market-routes';
import { marketplaceLocationPrefix } from '@/config/market-routes';
import { COUNTRY_SLUG } from '@/config/locations';

type SearchParams = Record<string, string | string[] | undefined>;

function marketFromLegacyType(type: string | undefined): BrowseMarket {
  return type === 'business' ? 'business' : 'need';
}

function buildQuery(searchParams: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'type') continue;
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value != null) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/**
 * Map legacy `/s/**` to canonical `/n/**` or `/b/**` (301 target).
 */
export function legacySearchRedirectTarget(
  pathname: string,
  searchParams: SearchParams = {}
): string {
  const typeParam = searchParams.type;
  const type = typeof typeParam === 'string' ? typeParam : undefined;
  const market = marketFromLegacyType(type);

  const rest = pathname.replace(/^\/s\/?/, '').split('/').filter(Boolean);
  const [loc = COUNTRY_SLUG, ...segments] = rest;
  const base = marketplaceLocationPrefix(loc, market);
  const path = segments.length > 0
    ? `${base}/${segments.map(encodeURIComponent).join('/')}`
    : base;

  return `${path}${buildQuery(searchParams)}`;
}
