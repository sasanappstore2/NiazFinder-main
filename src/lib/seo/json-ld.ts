import { SITE_NAME, SITE_URL } from '@/lib/constants';
import type { ServiceRequest, SpecialistProfile, Review } from '@/lib/types';
import { routeBuilder } from '@/config/routes';

/**
 * ساختار داده‌های JSON-LD
 * هر تابع یک اسکیمای JSON-LD معتبر برای موتورهای جستجو برمی‌گرداند
 */

// رابط عمومی اسکیمای سازمان
interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
  contactPoint: {
    '@type': 'ContactPoint';
    telephone: string;
    contactType: string;
    availableLanguage: string[];
  };
  sameAs: string[];
}

// رابط اسکیمای وب‌سایت
interface WebSiteSchema {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  description: string;
  inLanguage: string;
  potentialAction: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
}

// رابط اسکیمای لیست آیتم‌ها
interface ItemListSchema {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  name: string;
  description: string;
  numberOfItems: number;
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    item: {
      '@type': string;
      name: string;
      url: string;
      description?: string;
      offers?: {
        '@type': 'Offer';
        priceCurrency: string;
        price: string;
      };
    };
  }[];
}

// رابط اسکیمای خدمات
interface ServiceSchema {
  '@context': 'https://schema.org';
  '@type': 'Service';
  name: string;
  description: string;
  url: string;
  provider: {
    '@type': 'Person';
    name: string;
    url?: string;
  };
  areaServed: string;
  offers?: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    priceSpecification?: {
      '@type': 'PriceSpecification';
      price: string;
      priceCurrency: string;
    };
  };
}

// رابط اسکیمای شخص/حرفه
interface ProfessionalServiceSchema {
  '@context': 'https://schema.org';
  '@type': 'ProfessionalService';
  name: string;
  url: string;
  description: string;
  image?: string;
  address?: {
    '@type': 'PostalAddress';
    addressLocality: string;
    addressCountry: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string;
    reviewCount: string;
    bestRating: string;
  };
  hasOfferCatalog?: {
    '@type': 'OfferCatalog';
    name: string;
    itemListElement: {
      '@type': 'Offer';
      itemOffered: {
        '@type': 'Service';
        name: string;
      };
    };
  }[];
}

// رابط اسکیمای سوالات متداول
interface FAQSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }[];
}

// رابط آیتم نان‌تخم‌مرغ
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }[];
}

// رابط اسکیمای بررسی/نظر
interface ReviewSchema {
  '@context': 'https://schema.org';
  '@type': 'Review';
  reviewRating: {
    '@type': 'Rating';
    ratingValue: string;
    bestRating: string;
  };
  author: {
    '@type': 'Person';
    name: string;
  };
  reviewBody?: string;
  datePublished?: string;
}

/**
 * اسکیمای سازمان - اطلاعات کلی سایت
 */
export function createOrganizationSchema(): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'نیاز فایندر - پلتفرم هوشمند اتصال کارفرمایان به متخصص‌ها',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+98-21-1234-5678',
      contactType: 'customer service',
      availableLanguage: ['Persian', 'English'],
    },
    sameAs: [
      'https://twitter.com/needfinder_ir',
      'https://instagram.com/needfinder_ir',
      'https://linkedin.com/company/needfinder',
    ],
  };
}

/**
 * اسکیمای وب‌سایت - با قابلیت جستجو
 */
export function createWebsiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'نیاز خود را ثبت کنید، بهترین متخصص‌ها را پیدا کنید',
    inLanguage: 'fa-IR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/requests?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * اسکیمای بازار - لیست درخواست‌های خدمات
 */
export function createMarketplaceSchema(
  requests: { name: string; slug: string; description?: string; budgetMin?: number; budgetMax?: number }[]
): ItemListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `درخواست‌های خدمات ${SITE_NAME}`,
    description: 'لیست درخواست‌های خدمات ثبت شده در نیاز فایندر',
    numberOfItems: requests.length,
    itemListElement: requests.map((req, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      item: {
        '@type': 'Service' as const,
        name: req.name,
        url: `${SITE_URL}/requests/${req.slug}`,
        description: req.description,
        ...(req.budgetMin && {
          offers: {
            '@type': 'Offer' as const,
            priceCurrency: 'IRR',
            price: req.budgetMin.toString(),
          },
        }),
      },
    })),
  };
}

/**
 * اسکیمای درخواست خدمات فردی
 */
export function createRequestSchema(request: ServiceRequest): ServiceSchema {
  const budgetText = request.budgetType === 'NEGOTIABLE'
    ? 'توافقی'
    : request.budgetType === 'HOURLY'
      ? `${(request.budgetMin || 0).toLocaleString('fa-IR')} تومان/ساعت`
      : request.budgetMin && request.budgetMax
        ? `${request.budgetMin.toLocaleString('fa-IR')} - ${request.budgetMax.toLocaleString('fa-IR')} تومان`
        : 'توافقی';

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: request.title,
    description: request.description,
    url: `${SITE_URL}/requests/${request.slug}`,
    provider: {
      '@type': 'Person',
      name: `${request.user.firstName} ${request.user.lastName}`,
    },
    areaServed: request.city || request.province || 'ایران',
    offers: {
      '@type': 'Offer',
      price: budgetText,
      priceCurrency: 'IRR',
    },
  };
}

/**
 * اسکیمای پروفایل متخصص
 */
export function createSpecialistSchema(specialist: SpecialistProfile): ProfessionalServiceSchema {
  const schema: ProfessionalServiceSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: `${specialist.firstName} ${specialist.lastName}`,
    url: `${SITE_URL}${routeBuilder.pro(specialist.id)}`,
    description: specialist.bio || '',
    ...(specialist.avatar && { image: specialist.avatar }),
    ...(specialist.city && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: specialist.city,
        addressCountry: 'IR',
      },
    }),
  };

  // اضافه کردن امتیاز تجمیعی در صورت وجود
  if (specialist.rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: specialist.rating.toString(),
      reviewCount: specialist.projectCount.toString(),
      bestRating: '5',
    };
  }

  // اضافه کردن لیست مهارت‌ها به عنوان کاتالوگ خدمات
  if (specialist.skills.length > 0) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'خدمات و مهارت‌ها',
      itemListElement: specialist.skills.map((skill) => ({
        '@type': 'Offer' as const,
        itemOffered: {
          '@type': 'Service' as const,
          name: skill.name,
        },
      })),
    };
  }

  return schema;
}

/**
 * اسکیمای سوالات متداول
 */
export function createFAQSchema(
  faqs: { question: string; answer: string }[]
): FAQSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question' as const,
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: faq.answer,
      },
    })),
  };
}

/**
 * اسکیمای نان‌تخم‌مرغ - مسیر ناوبری
 */
export function createBreadcrumbSchema(items: BreadcrumbItem[]): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * اسکیمای بررسی/نظر
 */
export function createReviewSchema(review: Review): ReviewSchema {
  const schema: ReviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating.toString(),
      bestRating: '5',
    },
    author: {
      '@type': 'Person',
      name: `${review.author.firstName} ${review.author.lastName}`,
    },
  };

  if (review.comment) {
    schema.reviewBody = review.comment;
  }

  if (review.createdAt) {
    schema.datePublished = review.createdAt;
  }

  return schema;
}

/**
 * تبدیل شیء JSON-LD به رشته JSON برای استفاده در تگ script
 */
export function schemaToJsonLd<T extends Record<string, unknown>>(schema: T): string {
  return JSON.stringify(schema);
}
