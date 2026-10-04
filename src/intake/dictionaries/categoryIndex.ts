import type { CategoryIndexEntry } from '@/intake/types';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';

/** Simplified entity key for API output (apartment, villa, car, …). */
const SIMPLIFIED_KEYS: Record<string, string> = {
  'apartment-sale': 'apartment',
  'apartment-rent': 'apartment',
  'villa-sale': 'villa',
  'villa-rent': 'villa',
  'land-sale': 'land',
  'land-rent': 'land',
  'office-sale': 'office',
  'office-rent': 'office',
  'shop-sale': 'shop',
  'shop-rent': 'shop',
  'suite-apartment-rent': 'apartment',
  'villa-short-rent': 'villa',
  plumbing: 'plumbing',
  cleaning: 'cleaning',
  repairs: 'repairs',
  electrical: 'electrical',
  painting: 'painting',
  moving: 'moving',
  car: 'car',
  'mobile-phone': 'mobile-phone',
  laptop: 'laptop',
};

/** Built-in synonym map — extensible without code changes via DB merge in loader. */
export const CATEGORY_SYNONYMS: Record<string, readonly string[]> = {
  'apartment-sale': ['آپارتمان', 'اپارتمان', 'آپارت', 'واحد', 'خونه', 'خانه', 'مسکونی'],
  'apartment-rent': ['آپارتمان', 'اپارتمان', 'آپارت', 'واحد', 'خونه', 'خانه', 'مسکونی'],
  'villa-sale': ['ویلا', 'خانه ویلایی', 'خانه', 'خونه'],
  'villa-rent': ['ویلا', 'خانه ویلایی', 'خانه', 'خونه'],
  'land-sale': ['زمین', 'کلنگی', 'زمین کلنگی'],
  'land-rent': ['اجاره زمین', 'زمین'],
  'office-sale': ['دفتر', 'دفتر کار', 'اداری'],
  'office-rent': ['دفتر', 'دفتر کار', 'اداری'],
  'shop-sale': ['مغازه', 'غرفه', 'پاساژ', 'سالن', 'مزون', 'کافه', 'بوتیک'],
  'shop-rent': ['مغازه', 'غرفه', 'پاساژ', 'سالن', 'مزون', 'کافه', 'بوتیک', 'آرایشگاه'],
  'suite-apartment-rent': ['سوئیت', 'اجاره روزانه', 'اجاره شبانه'],
  plumbing: ['لوله', 'لوله کشی', 'لوله‌کشی', 'تاسیسات'],
  cleaning: ['نظافت', 'نظافتچی', 'تمیزکاری'],
  repairs: ['تعمیر', 'تعمیرات', 'تعمیرکار'],
  electrical: ['برق', 'برقکاری', 'برق کار'],
  painting: ['نقاش', 'نقاشی', 'رنگ'],
  moving: ['اسباب کشی', 'اسباب‌کشی', 'باربری'],
  car: ['ماشین', 'خودرو', 'سواری'],
  'mobile-phone': ['گوشی', 'موبایل', 'تلفن همراه'],
  laptop: ['لپ تاپ', 'لپ‌تاپ', 'نوت بوک'],
  'real-estate': ['ملک مسکونی', 'املاک', 'مسکونی'],
};

export function simplifiedCategoryKey(slug: string): string {
  return SIMPLIFIED_KEYS[slug] ?? slug.split('-')[0] ?? slug;
}

export interface CategoryIndexBuild {
  categories: Map<string, CategoryIndexEntry>;
  categoryLookup: Map<string, string>;
}

export function buildCategoryIndex(
  extraSynonyms: Record<string, readonly string[]> = {}
): CategoryIndexBuild {
  const categories = new Map<string, CategoryIndexEntry>();
  const categoryLookup = new Map<string, string>();

  for (const cat of CANONICAL_CATEGORIES) {
    if (cat.depth === 0) continue;

    const mergedSynonyms = [
      cat.title,
      cat.englishTitle ?? '',
      ...(CATEGORY_SYNONYMS[cat.slug] ?? []),
      ...(extraSynonyms[cat.slug] ?? []),
    ].filter(Boolean);

    const entry: CategoryIndexEntry = {
      slug: cat.slug,
      simplifiedKey: simplifiedCategoryKey(cat.slug),
      title: cat.title,
      synonyms: mergedSynonyms,
    };
    categories.set(cat.slug, entry);

    for (const syn of mergedSynonyms) {
      const key = normalizeLookupKey(syn);
      if (key.length >= 2) categoryLookup.set(key, cat.slug);
    }
    categoryLookup.set(normalizeLookupKey(cat.slug), cat.slug);
  }

  return { categories, categoryLookup };
}
