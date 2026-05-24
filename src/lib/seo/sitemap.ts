/**
 * Sitemap generation — canonical URL patterns only.
 *
 * Canonical URL surface (Divar-style):
 *   /                                 home
 *   /s/iran                           search root (country-wide)
 *   /s/iran?type=need                 needs only
 *   /s/iran?type=business             businesses only
 *   /s/{city}                         city marketplace
 *   /s/iran/{cat}                     category in country
 *   /s/iran/{parent}/{cat}            nested category in country
 *   /s/{city}/{cat}                   category in city
 *   /v/{slug}/{id}                    listing detail (Divar /v/ parity)
 *   /pro/{id}                         business profile (Divar /pro/ parity)
 *   /post                             post a need
 *   /pricing                          pricing
 *   /help                             support
 *
 * Filters live ONLY in query params and are NOT enumerated in the sitemap
 * (would explode combinatorially); only the canonical "type" facet (need vs
 * business) is enumerated as it's the most important top-level scope.
 */

import { SITE_URL } from '@/lib/constants';
import { CANONICAL_CITIES } from '@/config/locations';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { slugifyTitle } from '@/lib/seo/slug';

// Default values
export const DEFAULT_CHANGEFREQ = 'weekly' as const;
export const DEFAULT_PRIORITY = 0.8;

export const SITEMAP_STATIC_URLS: { url: string; changefreq: string; priority: number }[] = [
  { url: '/',                       changefreq: 'daily',   priority: 1.0 },
  { url: '/s/iran',                 changefreq: 'hourly',  priority: 0.95 },
  { url: '/s/iran?type=need',       changefreq: 'hourly',  priority: 0.9 },
  { url: '/s/iran?type=business',   changefreq: 'daily',   priority: 0.9 },
  { url: '/post',                   changefreq: 'monthly', priority: 0.5 },
  { url: '/pricing',                changefreq: 'weekly',  priority: 0.7 },
  { url: '/help',                   changefreq: 'monthly', priority: 0.4 },
  { url: '/login',                  changefreq: 'monthly', priority: 0.3 },
  { url: '/register',               changefreq: 'monthly', priority: 0.3 },
];

export const DYNAMIC_ROUTE_PATTERNS: {
  pattern: string;
  changefreq: string;
  priority: number;
  description: string;
}[] = [
  { pattern: '/v/[slug]/[id]',         changefreq: 'daily',  priority: 0.85, description: 'صفحات جزئیات آگهی' },
  { pattern: '/pro/[id]',              changefreq: 'weekly', priority: 0.85, description: 'پروفایل کسب‌وکار' },
  { pattern: '/s/[city]',              changefreq: 'daily',  priority: 0.9,  description: 'بازار شهر' },
  { pattern: '/s/iran/[category]',     changefreq: 'daily',  priority: 0.85, description: 'بازار + دسته‌بندی (سراسر ایران)' },
  { pattern: '/s/[city]/[category]',   changefreq: 'daily',  priority: 0.8,  description: 'بازار شهر + دسته‌بندی' },
];

export const ROUTE_SITEMAP_CONFIG: Record<string, { changefreq: string; priority: number }> = {
  home:                { changefreq: 'daily',   priority: 1.0 },
  search:              { changefreq: 'hourly',  priority: 0.95 },
  need:                { changefreq: 'daily',   priority: 0.85 },
  business:            { changefreq: 'weekly',  priority: 0.85 },
  pricing:             { changefreq: 'weekly',  priority: 0.7 },
  help:                { changefreq: 'monthly', priority: 0.4 },
  dashboard:           { changefreq: 'weekly',  priority: 0.2 },
  messages:            { changefreq: 'always',  priority: 0.1 },
  notifications:       { changefreq: 'always',  priority: 0.1 },
  admin:               { changefreq: 'always',  priority: 0.0 },
  login:               { changefreq: 'monthly', priority: 0.3 },
  register:            { changefreq: 'monthly', priority: 0.3 },
};

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
}

/** Static URLs (home, /s/iran, /post, etc). */
export function generateStaticSitemapEntries(): SitemapEntry[] {
  return SITEMAP_STATIC_URLS.map((item) => ({
    url: `${SITE_URL}${item.url}`,
    changeFrequency: item.changefreq,
    priority: item.priority,
  }));
}

/** All canonical /s/{city} URLs (one per top city). */
export function generateCitySitemapEntries(): SitemapEntry[] {
  return CANONICAL_CITIES.map((city) => ({
    url: `${SITE_URL}/s/${city.slug}`,
    changeFrequency: 'daily',
    priority: 0.9,
  }));
}

/**
 * All canonical category landing URLs in country scope:
 *  /s/iran/{cat}                  (depth=1 leaf categories)
 *  /s/iran/{parent}/{cat}         (depth=2 nested leaves)
 */
export function generateCategorySitemapEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const cat of CANONICAL_CATEGORIES) {
    if (cat.depth === 0) continue; // depth-0 is grouping only
    if (cat.depth === 1) {
      entries.push({
        url: `${SITE_URL}/s/iran/${cat.slug}`,
        changeFrequency: 'daily',
        priority: 0.85,
      });
    } else if (cat.depth === 2 && cat.parentSlug) {
      entries.push({
        url: `${SITE_URL}/s/iran/${cat.parentSlug}/${cat.slug}`,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  }
  return entries;
}

/**
 * Cross-product city × category landings (top cities × top categories only).
 * Restricted to depth-1 (top-level under each section) to avoid sitemap blow-up.
 */
export function generateCityCategorySitemapEntries(maxCities = 10, maxCategories = 20): SitemapEntry[] {
  const cities = CANONICAL_CITIES.slice(0, maxCities);
  const cats = CANONICAL_CATEGORIES.filter((c) => c.depth === 1).slice(0, maxCategories);
  const entries: SitemapEntry[] = [];
  for (const city of cities) {
    for (const cat of cats) {
      entries.push({
        url: `${SITE_URL}/s/${city.slug}/${cat.slug}`,
        changeFrequency: 'weekly',
        priority: 0.75,
      });
    }
  }
  return entries;
}

/**
 * Build full sitemap with all canonical patterns + dynamic detail pages.
 *
 * `dynamicSlugs.requests` should provide `{ id, title, updatedAt }` so we can
 * generate `/n/{titleSlug}/{id}` entries (matches the canonical detail URL).
 */
export function generateFullSitemap(
  dynamicSlugs?: {
    requests?: { id: string; title: string; updatedAt?: string }[];
    specialists?: { id: string; updatedAt?: string }[];
  }
): SitemapEntry[] {
  const entries: SitemapEntry[] = [
    ...generateStaticSitemapEntries(),
    ...generateCitySitemapEntries(),
    ...generateCategorySitemapEntries(),
    ...generateCityCategorySitemapEntries(),
  ];

  if (dynamicSlugs?.requests) {
    for (const req of dynamicSlugs.requests) {
      const slug = slugifyTitle(req.title);
      entries.push({
        url: `${SITE_URL}/v/${slug}/${encodeURIComponent(req.id)}`,
        lastModified: req.updatedAt,
        changeFrequency: 'daily',
        priority: 0.85,
      });
    }
  }

  if (dynamicSlugs?.specialists) {
    for (const spec of dynamicSlugs.specialists) {
      entries.push({
        url: `${SITE_URL}/pro/${encodeURIComponent(spec.id)}`,
        lastModified: spec.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  }

  return entries;
}

/**
 * Backward-compatible helper — kept for any callers passing pattern strings.
 * Prefer the dedicated builders above.
 */
export function generateDynamicSitemapEntries(
  slugs: string[],
  pattern: string,
  changefreq: string = DEFAULT_CHANGEFREQ,
  priority: number = DEFAULT_PRIORITY
): SitemapEntry[] {
  return slugs.map((slug) => ({
    url: `${SITE_URL}${pattern.replace('[slug]', slug).replace('[id]', slug)}`,
    changeFrequency: changefreq,
    priority,
  }));
}
