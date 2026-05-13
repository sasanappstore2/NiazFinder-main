import type { Metadata } from 'next';
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/constants';
import { ROUTE_METADATA } from '@/lib/route-config';
import type { AppView } from '@/lib/types';

// تصویر پیش‌فرض سایت برای OpenGraph
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
// اندازه تصویر OpenGraph
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

/**
 * تنظیمات متادیتا برای هر صفحه
 */
export interface PageMetadataOptions {
  /** عنوان صفحه - از الگوی "%s | نیاز فایندر" استفاده می‌شود */
  title?: string;
  /** توضیحات صفحه */
  description?: string;
  /** کلمات کلیدی صفحه */
  keywords?: string[];
  /** مسیر صفحه (مثلاً /requests) */
  path?: string;
  /** نوع صفحه برای OpenGraph */
  type?: 'website' | 'article' | 'profile';
  /** تصویر OpenGraph سفارشی */
  image?: string;
  /** آیا ربات‌ها نباید صفحه را ایندکس کنند */
  noIndex?: boolean;
  /** آیا نباید از این صفحه لینک دنبال شود */
  noFollow?: boolean;
  /** نما/مسیر اپلیکیشن (برای استخراج عنوان پیش‌فرض) */
  view?: AppView;
  /** تاریخ انتشار (برای مقالات) */
  publishedTime?: string;
  /** تاریخ تغییر (برای مقالات) */
  modifiedTime?: string;
  /** نویسنده */
  author?: string;
}

/**
 * ساخت شیء Metadata برای Next.js
 * پشتیبانی از تمام ویژگی‌های SEO، OpenGraph، Twitter و زبان‌های مختلف
 *
 * @param options - تنظیمات متادیتای صفحه
 * @returns شیء Metadata قابل استفاده در generateMetadata یا metadata
 *
 * @example
 * ```ts
 * // استفاده در صفحه
 * export const metadata = createMetadata({
 *   title: 'طراحی سایت',
 *   description: 'بهترین متخصص‌های طراحی سایت را پیدا کنید',
 *   path: '/requests',
 *   keywords: ['طراحی سایت', 'وب', 'طراحی وب'],
 * });
 * ```
 */
export function createMetadata(options: PageMetadataOptions = {}): Metadata {
  const {
    title,
    description,
    keywords = [],
    path = '',
    type = 'website',
    image,
    noIndex = false,
    noFollow = false,
    view,
    publishedTime,
    modifiedTime,
    author,
  } = options;

  // عنوان نهایی - استفاده از الگوی "%s | نیاز فایندر"
  const pageTitle = title || view
    ? (title || ROUTE_METADATA[view as string]?.title || SITE_NAME)
    : SITE_NAME;
  const fullTitle = pageTitle === SITE_NAME
    ? `${SITE_NAME} - ${SITE_DESCRIPTION}`
    : `${pageTitle} | ${SITE_NAME}`;

  // توضیحات نهایی
  const pageDescription = description || view
    ? (ROUTE_METADATA[view as string]?.description || SITE_DESCRIPTION)
    : SITE_DESCRIPTION;

  // URL نهایی (canonical)
  const canonicalUrl = `${SITE_URL}${path}`;

  // تصویر OG
  const ogImage = image || DEFAULT_OG_IMAGE;

  // کلمات کلیدی ترکیبی
  const combinedKeywords = [
    'نیاز فایندر',
    'متخصص',
    'فریلنسر',
    'پروژه',
    'خدمات',
    'ایران',
    ...keywords,
  ];

  // ساخت شیء Metadata
  const metadata: Metadata = {
    title: fullTitle,
    description: pageDescription,
    keywords: combinedKeywords.join(', '),
    authors: author ? [{ name: author }] : [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,

    // تنظیمات ربات‌ها
    robots: {
      index: !noIndex,
      follow: !noFollow,
      googleBot: {
        index: !noIndex,
        follow: !noFollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // OpenGraph
    openGraph: {
      type,
      locale: 'fa_IR',
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: pageTitle === SITE_NAME ? fullTitle : pageTitle,
      description: pageDescription,
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: pageTitle,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: pageTitle === SITE_NAME ? fullTitle : pageTitle,
      description: pageDescription,
      images: [ogImage],
      creator: '@needfinder_ir',
      site: '@needfinder_ir',
    },

    // Canonical URL
    alternates: {
      canonical: canonicalUrl,
      // نسخه‌های مختلف زبانی
      languages: {
        'fa-IR': canonicalUrl,
        'en-US': `${SITE_URL}/en${path}`,
      },
    },

    // اطلاعات اضافی
    metadataBase: new URL(SITE_URL),
    formatDetection: {
      email: false,
      telephone: false,
    },
  };

  return metadata;
}

/**
 * ساخت متادیتای ساده برای صفحاتی که نیاز به تنظیمات کامل ندارند
 */
export function createSimpleMetadata(
  title: string,
  description: string,
  path: string = ''
): Metadata {
  return createMetadata({ title, description, path });
}
