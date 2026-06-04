export type BrowseSeoBlock = {
  market: 'need' | 'business';
  locationSlug: string;
  categorySlug?: string;
  title: string;
  paragraphs: string[];
};

/** Static crawlable copy for marketplace browse pages (sr-only in UI). */
export const BROWSE_SEO_BLOCKS: BrowseSeoBlock[] = [
  {
    market: 'need',
    locationSlug: 'iran',
    title: 'نیازهای ثبت‌شده در سراسر ایران',
    paragraphs: [
      'در بازار نیازهای نیاز فایندر می‌توانید آگهی‌های واقعی کارفرمایان را ببینید و با فیلتر شهر و دسته جستجو کنید.',
      'ثبت نیاز رایگان است و کسب‌وکارها می‌توانند پیشنهاد ارسال کنند.',
    ],
  },
  {
    market: 'business',
    locationSlug: 'iran',
    title: 'کسب‌وکارها و متخصصان در ایران',
    paragraphs: [
      'پروفایل کسب‌وکار، نمونه کار، محصولات ویترین و راه‌های تماس در یک صفحه قابل مشاهده است.',
      'برای مقایسه خدمات، امتیاز و پاسخ‌گویی را در کنار هم ببینید.',
    ],
  },
  {
    market: 'need',
    locationSlug: 'tehran',
    title: 'نیازها در تهران',
    paragraphs: [
      'نیازهای ثبت‌شده در تهران با امکان فیلتر دسته‌بندی و محله.',
    ],
  },
  {
    market: 'business',
    locationSlug: 'tehran',
    title: 'کسب‌وکارها در تهران',
    paragraphs: [
      'متخصصان و کسب‌وکارهای فعال در تهران — طراحی، فنی، خدمات منزل و بیشتر.',
    ],
  },
];

export function resolveBrowseSeoBlock(
  market: 'need' | 'business',
  locationSlug: string,
  categorySlug?: string
): BrowseSeoBlock | null {
  const exact = BROWSE_SEO_BLOCKS.find(
    (b) =>
      b.market === market &&
      b.locationSlug === locationSlug &&
      (categorySlug ? b.categorySlug === categorySlug : !b.categorySlug)
  );
  if (exact) return exact;
  return (
    BROWSE_SEO_BLOCKS.find(
      (b) => b.market === market && b.locationSlug === locationSlug && !b.categorySlug
    ) ?? null
  );
}
