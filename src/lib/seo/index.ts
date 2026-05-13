/**
 * ابزارهای SEO - صادرات یکپارچه
 * این فایل تمام توابع و ابزارهای مربوط به SEO را صادر می‌کند
 */

// متادیتا
export {
  createMetadata,
  createSimpleMetadata,
} from './metadata';
export type { PageMetadataOptions } from './metadata';

// اسکیماهای JSON-LD
export {
  createOrganizationSchema,
  createWebsiteSchema,
  createMarketplaceSchema,
  createRequestSchema,
  createSpecialistSchema,
  createFAQSchema,
  createBreadcrumbSchema,
  createReviewSchema,
  schemaToJsonLd,
} from './json-ld';

// نقشه سایت
export {
  SITEMAP_STATIC_URLS,
  DYNAMIC_ROUTE_PATTERNS,
  ROUTE_SITEMAP_CONFIG,
  generateStaticSitemapEntries,
  generateDynamicSitemapEntries,
  generateFullSitemap,
} from './sitemap';
export type { SitemapEntry } from './sitemap';
