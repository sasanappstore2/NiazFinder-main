/**
 * Sitemap generation — canonical URL patterns only.
 *
 * Canonical URL surface:
 *   /n/iran, /n/{city}              needs marketplace
 *   /b/iran, /b/{city}              businesses marketplace
 *   /v/{slug}/{id}                  listing detail
 *   /b/{profileSlug}                business profile
 */

import { SITE_URL } from '@/lib/constants';
import { CANONICAL_CITIES } from '@/config/locations';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { slugifyTitle } from '@/lib/seo/slug';
import { canonicalMarketPath } from '@/config/market-routes';

export const DEFAULT_CHANGEFREQ = 'weekly' as const;
export const DEFAULT_PRIORITY = 0.8;

export const SITEMAP_STATIC_URLS: { url: string; changefreq: string; priority: number }[] = [
  { url: '/n/iran',                 changefreq: 'hourly',  priority: 0.95 },
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
  { pattern: '/b/[profileSlug]',        changefreq: 'weekly', priority: 0.85, description: 'پروفایل کسب‌وکار' },
  { pattern: '/n/[city]',               changefreq: 'daily',  priority: 0.9,  description: 'بازار نیاز — شهر' },
  { pattern: '/b/[city]',               changefreq: 'daily',  priority: 0.9,  description: 'بازار کسب‌وکار — شهر' },
  { pattern: '/n/iran/[category]',      changefreq: 'daily',  priority: 0.85, description: 'نیازها + دسته (سراسر ایران)' },
  { pattern: '/b/iran/[category]',      changefreq: 'daily',  priority: 0.85, description: 'کسب‌وکار + دسته (سراسر ایران)' },
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

export function generateStaticSitemapEntries(): SitemapEntry[] {
  return SITEMAP_STATIC_URLS.map((item) => ({
    url: `${SITE_URL}${item.url}`,
    changeFrequency: item.changefreq,
    priority: item.priority,
  }));
}

export function generateCitySitemapEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const city of CANONICAL_CITIES) {
    entries.push({
      url: `${SITE_URL}${canonicalMarketPath('need', city.slug)}`,
      changeFrequency: 'daily',
      priority: 0.9,
    });
    entries.push({
      url: `${SITE_URL}${canonicalMarketPath('business', city.slug)}`,
      changeFrequency: 'daily',
      priority: 0.9,
    });
  }
  return entries;
}

export function generateCategorySitemapEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const cat of CANONICAL_CATEGORIES) {
    if (cat.depth === 0) continue;
    if (cat.depth === 1) {
      entries.push({
        url: `${SITE_URL}${canonicalMarketPath('need', 'iran', [cat.slug])}`,
        changeFrequency: 'daily',
        priority: 0.85,
      });
      entries.push({
        url: `${SITE_URL}${canonicalMarketPath('business', 'iran', [cat.slug])}`,
        changeFrequency: 'daily',
        priority: 0.85,
      });
    } else if (cat.depth === 2 && cat.parentSlug) {
      entries.push({
        url: `${SITE_URL}${canonicalMarketPath('need', 'iran', [cat.parentSlug, cat.slug])}`,
        changeFrequency: 'daily',
        priority: 0.8,
      });
      entries.push({
        url: `${SITE_URL}${canonicalMarketPath('business', 'iran', [cat.parentSlug, cat.slug])}`,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  }
  return entries;
}

export function generateCityCategorySitemapEntries(maxCities = 10, maxCategories = 20): SitemapEntry[] {
  const cities = CANONICAL_CITIES.slice(0, maxCities);
  const cats = CANONICAL_CATEGORIES.filter((c) => c.depth === 1).slice(0, maxCategories);
  const entries: SitemapEntry[] = [];
  for (const city of cities) {
    for (const cat of cats) {
      entries.push({
        url: `${SITE_URL}${canonicalMarketPath('need', city.slug, [cat.slug])}`,
        changeFrequency: 'weekly',
        priority: 0.75,
      });
      entries.push({
        url: `${SITE_URL}${canonicalMarketPath('business', city.slug, [cat.slug])}`,
        changeFrequency: 'weekly',
        priority: 0.75,
      });
    }
  }
  return entries;
}

export function generateFullSitemap(
  dynamicSlugs?: {
    requests?: { id: string; title: string; updatedAt?: string }[];
    specialists?: { id: string; slug?: string; updatedAt?: string }[];
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
      const path = spec.slug
        ? `/b/${encodeURIComponent(spec.slug)}`
        : `/pro/${encodeURIComponent(spec.id)}`;
      entries.push({
        url: `${SITE_URL}${path}`,
        lastModified: spec.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  }

  return entries;
}

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
