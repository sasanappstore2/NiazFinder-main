import { CANONICAL_CATEGORIES } from '@/config/categories';
import { CANONICAL_CITIES } from '@/config/locations';
import { canonicalMarketPath, type BrowseMarket } from '@/config/market-routes';
import { routeBuilder } from '@/config/routes';
import { SITEMAP_STATIC_URLS } from '@/lib/seo/sitemap';

export const CRAWL_FILTER_VARIANTS = [
  '',
  '?sort=recent',
  '?verified=true',
  '?sort=price-asc',
  '?has-photo=true',
  '?urgent=true',
] as const;

const EXTRA_STATIC = [
  '/discover',
  '/browse',
  '/dashboard',
  '/messages',
  '/notifications',
  '/bookmarks',
  '/blog',
  '/referral',
  '/social-feed',
  '/my-business',
  '/n',
  '/b',
  '/search',
  '/dev/intake-wizard',
  '/faq',
  '/privacy',
  '/terms',
  '/notification-settings',
  '/edit-profile',
  '/pricing',
  '/help',
  '/login',
  '/register',
  '/post',
  '/chat',
  '/chat/new',
] as const;

const MARKETS: BrowseMarket[] = ['need', 'business'];

function categoryPaths(): string[][] {
  const paths: string[][] = [];
  for (const cat of CANONICAL_CATEGORIES) {
    if (cat.depth === 1) paths.push([cat.slug]);
    if (cat.depth === 2 && cat.parentSlug) paths.push([cat.parentSlug, cat.slug]);
  }
  return paths;
}

function withFilters(path: string, includeFilters: boolean): string[] {
  if (!includeFilters || path.includes('?')) return [path];
  return CRAWL_FILTER_VARIANTS.map((q) => (q ? `${path}${q}` : path));
}

export function buildCatalogUrls(options?: {
  includeFilters?: boolean;
  includeCityCategories?: boolean;
  includeIranCategories?: boolean;
}): string[] {
  const includeFilters = options?.includeFilters ?? true;
  const includeCityCategories = options?.includeCityCategories ?? true;
  const includeIranCategories = options?.includeIranCategories ?? true;
  const urls = new Set<string>();

  for (const item of SITEMAP_STATIC_URLS) urls.add(item.url);
  for (const path of EXTRA_STATIC) urls.add(path);

  for (const market of MARKETS) {
    urls.add(canonicalMarketPath(market, 'iran'));
    for (const city of CANONICAL_CITIES) {
      urls.add(canonicalMarketPath(market, city.slug));
    }
  }

  const catPaths = categoryPaths();

  if (includeIranCategories) {
    for (const market of MARKETS) {
      for (const segments of catPaths) {
        urls.add(canonicalMarketPath(market, 'iran', segments));
      }
    }
  }

  if (includeCityCategories) {
    const depth1 = CANONICAL_CATEGORIES.filter((c) => c.depth === 1);
    const depth2 = CANONICAL_CATEGORIES.filter((c) => c.depth === 2 && c.parentSlug);

    for (const city of CANONICAL_CITIES) {
      for (const market of MARKETS) {
        for (const cat of depth1) {
          urls.add(canonicalMarketPath(market, city.slug, [cat.slug]));
        }
        for (const cat of depth2) {
          urls.add(canonicalMarketPath(market, city.slug, [cat.parentSlug!, cat.slug]));
        }
      }
    }
  }

  const expanded: string[] = [];
  for (const path of urls) {
    for (const p of withFilters(path, includeFilters)) expanded.push(p);
  }
  return expanded;
}

export function buildDynamicListingUrls(
  requests: { id: string; title: string }[],
  profiles: { slug: string }[]
): string[] {
  const urls: string[] = [];
  for (const req of requests) {
    urls.push(routeBuilder.listing(req.id, req.title));
  }
  for (const p of profiles) {
    urls.push(`/b/${encodeURIComponent(p.slug)}`);
    urls.push(`/pro/${encodeURIComponent(p.slug)}`);
  }
  return urls;
}

export function catalogStats(): Record<string, number> {
  const base = buildCatalogUrls({ includeFilters: false });
  const full = buildCatalogUrls({ includeFilters: true });
  return {
    cities: CANONICAL_CITIES.length,
    categories: CANONICAL_CATEGORIES.length,
    baseUrls: base.length,
    withFilters: full.length,
  };
}

/** Spread heavy combinations across marathon rounds (every city, every round). */
export function buildCatalogUrlsForRound(round: number): string[] {
  const urls = new Set<string>();
  const includeFilters = round % 2 === 0;
  const includeCityDepth2 = round === 1 || round % 3 === 0;
  const depth1 = CANONICAL_CATEGORIES.filter((c) => c.depth === 1);
  const depth2 = CANONICAL_CATEGORIES.filter((c) => c.depth === 2 && c.parentSlug);

  for (const item of SITEMAP_STATIC_URLS) urls.add(item.url);
  for (const path of EXTRA_STATIC) urls.add(path);

  for (const market of MARKETS) {
    urls.add(canonicalMarketPath(market, 'iran'));
    for (const city of CANONICAL_CITIES) {
      urls.add(canonicalMarketPath(market, city.slug));
      for (const cat of depth1) {
        urls.add(canonicalMarketPath(market, city.slug, [cat.slug]));
      }
      if (includeCityDepth2) {
        for (const cat of depth2) {
          urls.add(canonicalMarketPath(market, city.slug, [cat.parentSlug!, cat.slug]));
        }
      }
    }
    for (const cat of depth1) {
      urls.add(canonicalMarketPath(market, 'iran', [cat.slug]));
    }
    if (includeCityDepth2) {
      for (const cat of depth2) {
        urls.add(canonicalMarketPath(market, 'iran', [cat.parentSlug!, cat.slug]));
      }
    }
  }

  const expanded: string[] = [];
  for (const path of urls) {
    const isCityRoot = /^\/[nb]\/[^/]+$/.test(path);
    const useFilters = includeFilters && (isCityRoot || round % 4 === 0);
    for (const p of withFilters(path, useFilters)) expanded.push(p);
  }
  return expanded;
}
