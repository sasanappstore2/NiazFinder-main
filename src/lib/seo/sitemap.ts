import { SITE_URL } from '@/lib/constants';

/**
 * ثابت‌های URL و تنظیمات نقشه سایت
 * شامل تمام مسیرهای ثابت، الگوهای مسیرهای داینامیک و تنظیمات فرکانس/اولویت
 */

// تنظیمات فرکانس و اولویت پیش‌فرض
export const DEFAULT_CHANGEFREQ = 'weekly' as const;
export const DEFAULT_PRIORITY = 0.8;

// ثابت‌های مسیر ثابت سایت
export const SITEMAP_STATIC_URLS: { url: string; changefreq: string; priority: number }[] = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/requests', changefreq: 'hourly', priority: 0.95 },
  { url: '/specialists', changefreq: 'daily', priority: 0.95 },
  { url: '/pricing', changefreq: 'weekly', priority: 0.7 },
  { url: '/login', changefreq: 'monthly', priority: 0.3 },
  { url: '/register', changefreq: 'monthly', priority: 0.3 },
];

// الگوهای مسیرهای داینامیک برای تولید نقشه سایت
export const DYNAMIC_ROUTE_PATTERNS: {
  pattern: string;
  changefreq: string;
  priority: number;
  description: string;
}[] = [
  {
    pattern: '/requests/[slug]',
    changefreq: 'daily',
    priority: 0.8,
    description: 'صفحات جزئیات درخواست خدمات',
  },
  {
    pattern: '/specialists/[id]',
    changefreq: 'weekly',
    priority: 0.8,
    description: 'صفحات پروفایل متخصص',
  },
  {
    pattern: '/categories/[slug]',
    changefreq: 'weekly',
    priority: 0.7,
    description: 'صفحات دسته‌بندی‌ها',
  },
];

// نگاشت فرکانس تغییر و اولویت بر اساس نوع صفحه
export const ROUTE_SITEMAP_CONFIG: Record<string, { changefreq: string; priority: number }> = {
  home: { changefreq: 'daily', priority: 1.0 },
  'browse-requests': { changefreq: 'hourly', priority: 0.95 },
  'browse-specialists': { changefreq: 'daily', priority: 0.95 },
  'request-detail': { changefreq: 'daily', priority: 0.8 },
  'specialist-profile': { changefreq: 'weekly', priority: 0.8 },
  pricing: { changefreq: 'weekly', priority: 0.7 },
  dashboard: { changefreq: 'weekly', priority: 0.2 },
  messages: { changefreq: 'always', priority: 0.1 },
  notifications: { changefreq: 'always', priority: 0.1 },
  admin: { changefreq: 'always', priority: 0.0 },
  login: { changefreq: 'monthly', priority: 0.3 },
  register: { changefreq: 'monthly', priority: 0.3 },
};

// رابط آیتم نقشه سایت
export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
}

/**
 * ساخت آیتم‌های نقشه سایت از مسیرهای ثابت
 */
export function generateStaticSitemapEntries(): SitemapEntry[] {
  return SITEMAP_STATIC_URLS.map((item) => ({
    url: `${SITE_URL}${item.url}`,
    changeFrequency: item.changefreq,
    priority: item.priority,
  }));
}

/**
 * ساخت آیتم‌های نقشه سایت برای مسیرهای داینامیک
 * @param slugs - آرایه‌ای از شناسه/اسلاگ‌های داینامیک
 * @param pattern - الگوی مسیر (مثلاً '/requests/[slug]')
 * @param changefreq - فرکانس تغییر
 * @param priority - اولویت
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

/**
 * ساخت کامل نقشه سایت از تمام منابع
 * @param dynamicSlugs - اسلاگ‌های داینامیک برای هر مسیر
 */
export function generateFullSitemap(
  dynamicSlugs?: {
    requests?: { slug: string; updatedAt?: string }[];
    specialists?: { id: string; updatedAt?: string }[];
  }
): SitemapEntry[] {
  const entries: SitemapEntry[] = [
    ...generateStaticSitemapEntries(),
  ];

  if (dynamicSlugs?.requests) {
    entries.push(
      ...dynamicSlugs.requests.map((req) => ({
        url: `${SITE_URL}/requests/${req.slug}`,
        lastModified: req.updatedAt,
        changeFrequency: 'daily',
        priority: 0.8,
      }))
    );
  }

  if (dynamicSlugs?.specialists) {
    entries.push(
      ...dynamicSlugs.specialists.map((spec) => ({
        url: `${SITE_URL}/specialists/${spec.id}`,
        lastModified: spec.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
    );
  }

  return entries;
}
