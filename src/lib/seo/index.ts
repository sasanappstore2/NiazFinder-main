// ═══════════════════════════════════════════════════════════════════
// Need Finder - SEO Utility Library
// Comprehensive SEO helpers for Persian (Farsi) marketplace
// ═══════════════════════════════════════════════════════════════════

export const SITE_URL = 'https://needfinder.ir';
export const SITE_NAME = 'نیاز فایندر';
export const SITE_NAME_EN = 'NeedFinder';
export const SITE_TAGLINE = 'پلتفرم هوشمند اتصال نیاز به کسب‌وکار';
export const SITE_DESCRIPTION = 'نیاز فایندر، پلتفرم هوشمند ایرانی برای ثبت نیاز و پیدا کردن بهترین کسب‌وکارها در تمامی حوزه‌ها包括 طراحی وب، برنامه‌نویسی، طراحی گرافیک، خدمات خانگی، مشاوره و بیش از ۵۰ تخصص دیگر. ثبت نیاز رایگان، دریافت پیشنهاد از کسب‌وکارها معتبر، پرداخت امن.';
export const SITE_KEYWORDS = [
  'نیاز فایندر', 'ثبت نیاز', 'پیدا کردن کسب‌وکار', 'فریلنسر ایرانی',
  'خدمات آنلاین', 'کسب‌وکار حرفه‌ای', 'پروژه فریلنسری', 'کارفرما',
  'طراحی وب', 'برنامه‌نویسی', 'طراحی گرافیک', 'خدمات خانگی',
  'تعمیرات', 'مشاوره', 'آموزش', 'سئو', 'تولید محتوا',
  'اپلیکیشن موبایل', 'هوش مصنوعی', 'فلاتر', 'ری‌اکت',
  'فریلنسر', 'کار در خانه', 'درآمد آنلاین',
];

export const LOCALE = 'fa_IR';
export const DEFAULT_LOCALE = 'fa';
export const ALTERNATE_LOCALES = [
  { locale: 'fa', lang: 'fa-IR', href: SITE_URL },
];

// ═══════════════════════════════════════════════════════════════════
// JSON-LD Structured Data Generators
// ═══════════════════════════════════════════════════════════════════

/**
 * Organization schema - Company/brand identity
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: SITE_DESCRIPTION,
    foundingDate: '2024',
    foundingLocation: {
      '@type': 'Place',
      name: 'تهران، ایران',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'تهران',
      addressRegion: 'تهران',
      addressCountry: 'IR',
      streetAddress: 'خیابان ولیعصر',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+98-21-91000000',
        contactType: 'customer service',
        availableLanguage: ['Persian', 'English'],
        areaServed: 'IR',
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'info@needfinder.ir',
        availableLanguage: ['Persian', 'English'],
      },
    ],
    sameAs: [
      'https://instagram.com/needfinder',
      'https://twitter.com/needfinder',
      'https://linkedin.com/company/needfinder',
    ],
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      minValue: 10,
      maxValue: 50,
    },
  };
}

/**
 * WebSite schema with SearchAction
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    inLanguage: ['fa-IR', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * WebPage schema for the homepage
 */
export function generateWebPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
    about: {
      '@id': `${SITE_URL}/#organization`,
    },
    inLanguage: 'fa-IR',
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString().split('T')[0],
  };
}

/**
 * FAQPage schema from FAQ data
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * ItemList schema for categories, specialists, or requests
 */
export function generateItemListSchema(
  name: string,
  description: string,
  items: Array<{ name: string; url: string; position?: number }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: item.position || index + 1,
      name: item.name,
      url: `${SITE_URL}/${item.url}`,
    })),
  };
}

/**
 * Service schema for each category
 */
export function generateServiceSchema(
  name: string,
  description: string,
  provider: string = SITE_NAME
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    provider: {
      '@type': 'Organization',
      name: provider,
      url: SITE_URL,
    },
    areaServed: {
      '@type': 'Country',
      name: 'ایران',
    },
  };
}

/**
 * Offer schema for pricing plans
 */
export function generateOfferSchema(
  name: string,
  price: number,
  priceCurrency: string = 'IRR',
  description?: string
) {
  return {
    '@type': 'Offer',
    name,
    price: price === 0 ? '0' : price.toString(),
    priceCurrency,
    description: description || name,
    availability: 'https://schema.org/InStock',
    seller: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  };
}

/**
 * AggregateRating schema
 */
export function generateAggregateRatingSchema(
  name: string,
  ratingValue: number,
  reviewCount: number,
  bestRating: number = 5
) {
  return {
    '@type': 'AggregateRating',
    name,
    ratingValue,
    reviewCount,
    bestRating,
    worstRating: 1,
  };
}

/**
 * Review schema
 */
export function generateReviewSchema(
  author: string,
  rating: number,
  comment: string,
  date: string
) {
  return {
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rating,
      bestRating: 5,
    },
    reviewBody: comment,
    datePublished: date,
  };
}

/**
 * Combined homepage structured data
 */
export function generateHomepageStructuredData(faqs: Array<{ question: string; answer: string }>) {
  const organization = generateOrganizationSchema();
  const website = generateWebSiteSchema();
  const webpage = generateWebPageSchema();
  const faqPage = generateFAQSchema(faqs);

  // Homepage breadcrumb
  const breadcrumb = generateBreadcrumbSchema([
    { name: 'صفحه اصلی', url: SITE_URL },
  ]);

  return [organization, website, webpage, faqPage, breadcrumb];
}

/**
 * Combine multiple JSON-LD objects for script tag
 */
export function combineJsonLd(schemas: Record<string, unknown>[]) {
  return schemas.map((schema) => ({
    __html: JSON.stringify(schema),
  }));
}

// ═══════════════════════════════════════════════════════════════════
// SEO Route Configuration
// Virtual routes for SPA navigation - used in sitemap & breadcrumbs
// ═══════════════════════════════════════════════════════════════════

export interface SEORoute {
  path: string;
  title: string;
  description: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  section: string;
}

export const SEO_ROUTES: SEORoute[] = [
  {
    path: '/',
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    priority: 1.0,
    changeFrequency: 'daily',
    section: 'صفحه اصلی',
  },
  {
    path: '/n/iran',
    title: 'نیازهای ثبت شده - نیاز فایندر',
    description: 'مشاهده و جستجوی آخرین نیازهای ثبت شده توسط کارفرمایان. از طراحی وب تا خدمات خانگی، بهترین فرصت‌های کاری را پیدا کنید.',
    priority: 0.9,
    changeFrequency: 'daily',
    section: 'نیازها',
  },
  {
    path: '/b/iran',
    title: 'کسب‌وکارها و فریلنسرها - نیاز فایندر',
    description: 'جستجو و مقایسه کسب‌وکارها حرفه‌ای در بیش از ۵۰ تخصص. پروفایل، امتیاز، نمونه کار و قیمت کسب‌وکارها برتر ایران.',
    priority: 0.9,
    changeFrequency: 'daily',
    section: 'کسب‌وکارها',
  },
  {
    path: '/post',
    title: 'ثبت نیاز رایگان - نیاز فایندر',
    description: 'نیاز خود را رایگان ثبت کنید و در کمتر از ۲۴ ساعت پیشنهاد از بهترین کسب‌وکارها دریافت کنید. طراحی وب، برنامه‌نویسی، خدمات خانگی و بیشتر.',
    priority: 0.8,
    changeFrequency: 'monthly',
    section: 'ثبت نیاز',
  },
  {
    path: '/pricing',
    title: 'تعرفه‌ها و طرح‌های اشتراک - نیاز فایندر',
    description: 'طرح‌های اشتراک نیاز فایندر: رایگان، حرفه‌ای و سازمانی. امکانات هر طرح و قیمت‌ها را مقایسه کنید.',
    priority: 0.7,
    changeFrequency: 'monthly',
    section: 'تعرفه‌ها',
  },
  {
    path: '/referral',
    title: 'دعوت از دوستان - نیاز فایندر',
    description: 'از برنامه دعوت از دوستان نیاز فایندر بهره‌مند شوید. با معرفی دوستان، کد تخفیف و پاداش نقدی دریافت کنید.',
    priority: 0.5,
    changeFrequency: 'monthly',
    section: 'دعوت',
  },
];

// ═══════════════════════════════════════════════════════════════════
// Category Routes for Sitemap
// ═══════════════════════════════════════════════════════════════════

export interface CategoryRoute {
  slug: string;
  name: string;
  parentSlug?: string;
}

export const CATEGORY_ROUTES: CategoryRoute[] = [
  { slug: 'web-design-development', name: 'طراحی و توسعه وب' },
  { slug: 'website-design', name: 'طراحی سایت', parentSlug: 'web-design-development' },
  { slug: 'frontend-development', name: 'توسعه فرانت‌اند', parentSlug: 'web-design-development' },
  { slug: 'backend-development', name: 'توسعه بک‌اند', parentSlug: 'web-design-development' },
  { slug: 'mobile-app', name: 'اپلیکیشن موبایل' },
  { slug: 'android', name: 'اندروید', parentSlug: 'mobile-app' },
  { slug: 'ios', name: 'iOS', parentSlug: 'mobile-app' },
  { slug: 'flutter', name: 'فلاتر', parentSlug: 'mobile-app' },
  { slug: 'content-creation', name: 'تولید محتوا' },
  { slug: 'copywriting', name: 'نویسندگی', parentSlug: 'content-creation' },
  { slug: 'seo', name: 'سئو', parentSlug: 'content-creation' },
  { slug: 'translation', name: 'ترجمه', parentSlug: 'content-creation' },
  { slug: 'graphic-design', name: 'طراحی گرافیک' },
  { slug: 'logo-design', name: 'طراحی لوگو', parentSlug: 'graphic-design' },
  { slug: 'ui-ux-design', name: 'UI/UX', parentSlug: 'graphic-design' },
  { slug: 'banner-poster', name: 'بنر و پوستر', parentSlug: 'graphic-design' },
  { slug: 'home-services', name: 'خدمات خانگی' },
  { slug: 'cleaning', name: 'نظافت منزل', parentSlug: 'home-services' },
  { slug: 'plumbing', name: 'تاسیسات', parentSlug: 'home-services' },
  { slug: 'electrical', name: 'برقکاری', parentSlug: 'home-services' },
  { slug: 'repair-services', name: 'تعمیرات' },
  { slug: 'mobile-repair', name: 'تعمیر موبایل', parentSlug: 'repair-services' },
  { slug: 'laptop-repair', name: 'تعمیر لپ‌تاپ', parentSlug: 'repair-services' },
  { slug: 'car-repair', name: 'تعمیر خودرو', parentSlug: 'repair-services' },
  { slug: 'consulting-education', name: 'مشاوره و آموزش' },
  { slug: 'immigration-consulting', name: 'مشاور مهاجرت', parentSlug: 'consulting-education' },
  { slug: 'private-tutoring', name: 'آموزش خصوصی', parentSlug: 'consulting-education' },
  { slug: 'legal-services', name: 'وکالت', parentSlug: 'consulting-education' },
  { slug: 'ai-services', name: 'هوش مصنوعی' },
  { slug: 'chatbot', name: 'چت‌بات', parentSlug: 'ai-services' },
  { slug: 'image-processing', name: 'پردازش تصویر', parentSlug: 'ai-services' },
  { slug: 'machine-learning', name: 'یادگیری ماشین', parentSlug: 'ai-services' },
];

// ═══════════════════════════════════════════════════════════════════
// Internal Link Configuration
// ═══════════════════════════════════════════════════════════════════

export interface InternalLink {
  label: string;
  href: string;
  title: string;
  section: string;
}

export const INTERNAL_LINKS: InternalLink[] = [
  { label: 'ثبت نیاز رایگان', href: '/post', title: 'نیاز خود را رایگان ثبت کنید', section: 'hero' },
  { label: 'جستجوی کسب‌وکار', href: '/b/iran', title: 'کسب‌وکارها حرفه‌ای را پیدا کنید', section: 'hero' },
  { label: 'مشاهده همه نیازها', href: '/n/iran', title: 'تمام نیازهای ثبت شده', section: 'featured-requests' },
  { label: 'مشاهده همه کسب‌وکارها', href: '/b/iran', title: 'تمام کسب‌وکارها', section: 'top-specialists' },
  { label: 'تعرفه‌ها', href: '/pricing', title: 'طرح‌های اشتراک و قیمت‌ها', section: 'pricing' },
  { label: 'دعوت از دوستان', href: '/referral', title: 'دعوت از دوستان و دریافت پاداش', section: 'referral' },
  { label: 'سوالات متداول', href: '/#faq', title: 'پاسخ سوالات رایج', section: 'faq' },
  { label: 'تماس با ما', href: '/#contact', title: 'اطلاعات تماس', section: 'contact' },
  { label: 'داشبورد', href: '/dashboard', title: 'داشبورد کاربری', section: 'dashboard' },
  { label: 'پیام‌ها', href: '/messages', title: 'پیام‌رسانی', section: 'messages' },
  { label: 'اعلان‌ها', href: '/notifications', title: 'اعلان‌ها و نوتیفیکیشن‌ها', section: 'notifications' },
];
