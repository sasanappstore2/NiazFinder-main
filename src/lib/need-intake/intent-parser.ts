import type { IntentType, ParsedIntent } from '@/contracts/need-intake';
import {
  DEFAULT_INTENT,
  getIntentsForCategory,
} from '@/config/need-intents';
import { CANONICAL_CITIES } from '@/config/locations';
import {
  CANONICAL_CATEGORIES,
  getCategoryBySlug,
  getCategoryPath,
  legacyValueToSlug,
  normalizeCategoryPair,
} from '@/config/categories';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import { toAsciiDigits } from '@/lib/format/digits';

function withAsciiDigitRuns(text: string): string {
  return normalizeIntakeText(text).replace(/[۰-۹٠-٩0-9]+/g, (run) => toAsciiDigits(run));
}
import { buildPropertyTitle } from '@/lib/need-intake/property-title';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import {
  hasConcreteProductNoun,
  hasGamingProductPhrase,
  hasPetProductPhrase,
  hasWatchOrLuxuryProductPhrase,
  isLikelyProductPurchase,
} from '@/lib/need-intake/product-buy-hints';
import {
  detectBusinessCommercialCategory,
  getBusinessCommercialPropertyCandidates,
  isAmbiguousCommercialSubtype,
  isBusinessCommercialPropertyIntent,
} from '@/lib/need-intake/business-commercial-property-intent';
import { detectRepairServiceCategory } from '@/lib/need-intake/service-repair-intent';
import { extractVehicleSubjectFromText } from '@/lib/need-intake/vertical-title';
import {
  categorySlugForVertical,
  classifyVertical,
  isVerticalConfident,
  parseAreaFromText,
  type VerticalClassification,
} from '@/lib/need-intake/vertical-classifier';

const WANT_KEYWORDS = ['میخوام', 'میخواهم', 'نیاز دارم', 'دنبال', 'جستجو', 'پیدا کن'];
const BUY_KEYWORDS = ['می‌خرم', 'می خرم', 'میخرم', 'بخرم', 'خرید', 'میخرم'];
const ALL_BUY_HINT_KEYWORDS = [...WANT_KEYWORDS, ...BUY_KEYWORDS];
const SELL_KEYWORDS = ['می‌فروشم', 'میفروشم', 'فروش', 'آگهی', 'فروشنده'];

function textHasSellKeyword(text: string): boolean {
  // Bare «فروش» must not match «میوه‌فروشی» / «کتاب‌فروشی».
  if (/فروش(?!ی)|می\s*فروشم|میفروشم|فروشنده|آگهی/u.test(text)) return true;
  return false;
}
import {
  isLandlordOfferRent,
  isLandlordOfferRahn,
  isSeekerRahnEjareDeal,
  isTenantSeekerRahnEjare,
  TENANT_SEEKER_OPENER,
} from '@/lib/need-intake/deal-type-helpers';

const NEED_SEEKER_OPENER = TENANT_SEEKER_OPENER;
const RENT_KEYWORDS = ['اجاره', 'اجاره‌ای', 'مستاجر'];

function textHasRentKeyword(text: string): boolean {
  // Avoid «رنت» inside «اینترنت» (#617).
  if (/اجاره|اجاره‌ای|مستاجر/u.test(text)) return true;
  return /(?<![\u0600-\u06FFa-zA-Z])رنت(?![\u0600-\u06FFa-zA-Z])/u.test(text);
}
const REPAIR_KEYWORDS = ['تعمیر', 'تعمیرکار', 'نصب'];
const URGENT_KEYWORDS = ['فوری', 'سریع', 'امروز', 'الان'];

const RAHN_FULL_KEYWORDS = ['رهن کامل', 'فقط رهن'];
// Standalone «ودیعه» is a synonym of رهن (a deposit-only budget = full-deposit
// need), NOT a deposit+rent cue; only the explicit «ودیعه و اجاره» compound is.
const RAHN_EJARE_KEYWORDS = ['رهن و اجاره', 'ودیعه و اجاره'];
const RENT_MONTHLY_KEYWORDS = ['اجاره ماهانه', 'اجاره ماهیانه'];
const RENT_SHORT_TERM_KEYWORDS = [
  'اجاره روزانه',
  'اجاره کوتاه',
  'کوتاه مدت',
  'کوتاه‌مدت',
  'هر شب',
  'تومان شب',
  'سوئیت روزانه',
  'اجاره شبانه',
];

/** مشارکت در ساخت / زمین برای ساخت — not buy/sell listing. */
export function isConstructionPartnershipText(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (t.includes('مشارکت')) {
    if (
      t.includes('ساخت') ||
      t.includes('سا خت') ||
      t.includes('ساز') ||
      t.includes('زمین') ||
      t.includes('پیشنهاد') ||
      t.includes('کلنگی')
    ) {
      return true;
    }
  }
  if (t.includes('پروانه ساختمانی') || t.includes('پایان کار')) return true;
  if (
    t.includes('امتیاز تعاونی') ||
    t.includes('تعاونی مسکن') ||
    t.includes('تعاونی شهرداری') ||
    t.includes('انبوه سازی')
  ) {
    return true;
  }
  if (t.includes('سازندگان محترم') || t.includes('زمینتو بسازی')) return true;
  if (t.includes('خرید و فروش') && (t.includes('امتیاز') || t.includes('تعاونی'))) {
    return true;
  }
  if (
    (t.includes('سرمایه گذاری') || t.includes('سرمایه‌گذاری') || t.includes('مستغل')) &&
    t.length < 90 &&
    !t.includes('خرید') &&
    !t.includes('اجاره') &&
    !/(\d{1,5})\s*مت(?:ر|ری)/u.test(t)
  ) {
    return true;
  }
  return (
    (t.includes('مشارکت') && (t.includes('ساخت') || t.includes('در ساخت') || t.includes('سا خت'))) ||
    t.includes('مشارکت در ساخت') ||
    t.includes('مشارکت ساخت') ||
    (t.includes('مشارکت') && (t.includes('سازنده') || t.includes('شریک'))) ||
    (t.includes('شریک') && t.includes('سازنده'))
  );
}

function hasPropertyContext(text: string): boolean {
  return /(?:متری|متر(?:\s|$|،|\/|\d)|طبق(?:ه|ات)|واحد|پنت|برج|آپارت|اپارت|ملک|ویلا|زمین|رهن|ودیعه|اجاره|خواب|مستقل)/u.test(
    text
  );
}

/** Category keyword hints → canonical slug (higher priority first).
 * Offline / legacy fallback only — live `/post` analyze uses
 * `runCategoryIntentEngine` (registry shortlist + optional LLM).
 */
const CATEGORY_KEYWORDS: { slug: string; words: string[]; priority: number }[] = [
  { slug: 'lost-found', words: ['گم شده', 'گمشده', 'گم کردم'], priority: 11 },
  {
    slug: 'construction-partnership',
    words: ['مشارکت در ساخت', 'مشارکت ساخت', 'مشارکت درساخت'],
    priority: 12,
  },
  { slug: 'agency-services', words: ['آژانس املاک', 'اژانس املاک', 'مشاور املاک'], priority: 10 },
  {
    slug: 'pre-sale-services',
    words: ['پیش فروش', 'پیش‌فروش', 'پیشفروش', 'پیش‌خرید', 'پیش خرید', 'پیش فروش پروژه', 'پیش‌فروش پروژه', 'پروژه مسکن'],
    priority: 10,
  },
  { slug: 'shop-sale', words: ['فروش مغازه', 'فروش غرفه', 'میفروشم مغازه', 'فروش یک مغازه'], priority: 12 },
  { slug: 'decorative-art', words: ['گلدان', 'گلدون', 'دکوراسیون', 'قاب عکس', 'دکور خونه'], priority: 12 },
  { slug: 'conference', words: ['همایش', 'سمینار', 'کنفرانس'], priority: 10 },
  { slug: 'motorcycle', words: ['موتورسیکلت', 'موتور سیکلت', 'موتوسیکلت', 'هوندا 125'], priority: 10 },
  { slug: 'boat', words: ['قایق', 'قایق تفریحی'], priority: 10 },
  { slug: 'refrigerator', words: ['یخچال', 'ساید بای ساید'], priority: 10 },
  { slug: 'sofa-chair', words: ['مبل', 'مبلمان', 'کاناپه'], priority: 10 },
  { slug: 'tickets', words: ['بلیط', 'بلیت'], priority: 10 },
  { slug: 'pets', words: ['گربه', 'سگ', 'حیوان خانگی', 'اکسلوتل', 'آکسلوتل', 'axolotl', 'حیوان آبی', 'آکواریوم', 'ماهی', 'پرنده', 'همستر', 'hamster', 'خرگوش', 'طوطی', 'قناری'], priority: 12 },
  { slug: 'clothing', words: ['کت و شلوار', 'پوشاک', 'لباس'], priority: 10 },
  { slug: 'camera', words: ['دوربین', 'کانن', 'نیکون'], priority: 10 },
  {
    slug: 'musical-instruments',
    words: [
      'پیانو',
      'piano',
      'گیتار',
      'گیتار الکتریک',
      'ویولن',
      'ویولون',
      'violon',
      'violin',
      'سنتور',
      'کمانچه',
      'تار',
      'آلات موسیقی',
      'ساز موسیقی',
      'درام',
      'drum',
      'سازدهنی',
      'هارمونیکا',
      'ساکسیفون',
      'clarinet',
      'کلارinet',
    ],
    priority: 11,
  },
  {
    slug: 'jewelry-watches',
    words: [
      'ساعت',
      'رولکس',
      'rolex',
      'دیتونا',
      'daytona',
      'امگا',
      'omega',
      'کارتیر',
      'cartier',
      'سابمارینر',
      'submariner',
    ],
    priority: 11,
  },
  { slug: 'land-sale', words: ['زمین', 'کلنگی', 'زمین کلنگی'], priority: 10 },
  { slug: 'land-rent', words: ['اجاره زمین', 'رهن زمین', 'ودیعه زمین', 'رهن و اجاره زمین'], priority: 11 },
  { slug: 'villa-rent', words: ['اجاره ویلا', 'اجاره خانه', 'اجاره ویلایی'], priority: 10 },
  { slug: 'shop-rent', words: ['اجاره مغازه', 'مغازه برای اجاره', 'مغازه اجاره‌ای'], priority: 10 },
  { slug: 'office-sale', words: ['فروش دفتر', 'دفتر کار'], priority: 10 },
  { slug: 'industrial-sale', words: ['سوله', 'صنعتی', 'انبار صنعتی'], priority: 10 },
  {
    slug: 'suite-apartment-rent',
    words: ['اجاره روزانه', 'اجاره شبانه', 'سوئیت روزانه', 'آپارتمان روزانه'],
    priority: 11,
  },
  { slug: 'apartment-rent', words: ['اجاره آپارتمان', 'اجاره ماهانه', 'رهن', 'ودیعه', 'رهن و اجاره'], priority: 9 },
  { slug: 'apartment-sale', words: ['خرید آپارتمان', 'فروش آپارتمان'], priority: 8 },
  // Bare «ملک» omitted — matches neighborhood tokens like «ملک‌شهر» after ZWNJ→space normalize.
  { slug: 'real-estate', words: ['آپارتمان', 'اپارتمان', 'آپارت', 'سوئیت', 'ملک مسکونی', 'پنت', 'پنت‌هاوس', 'برج', 'واحد', 'جهیزیه', 'مستغل', 'سرمایه‌گذاری', 'سرمایه گذاری'], priority: 7 },
  { slug: 'villa-sale', words: ['فروش ویلا', 'ویلا', 'خانه ویلایی'], priority: 8 },
  { slug: 'car', words: ['ماشین', 'خودرو', 'پژو', 'پراید', 'سمند', 'تیبا', 'دنا', 'هوندا', 'سمند'], priority: 8 },
  { slug: 'mobile-phone', words: ['گوشی', 'آیفون', 'iphone', 's24', 's23'], priority: 8 },
  { slug: 'laptop', words: ['لپ‌تاپ', 'لپ تاپ', 'macbook'], priority: 8 },
  { slug: 'tablet', words: ['تبلت'], priority: 8 },
  {
    slug: 'game-console',
    words: [
  'ps5',
  'ps4',
  'ps3',
  'playstation',
  'play station',
  'پلی استیشن',
  'پلی‌استیشن',
  'پلیستیشن',
  'پی اس فایو',
  'پی‌اس‌فایو',
  'پی اس 5',
  'xbox',
      'کنسول',
      'کنسول بازی',
      'دسته پلی',
      'دسته ps',
      'دسته بازی',
      'کنترلر',
      'gamepad',
      'نینتندو',
      'nintendo',
      'سوییچ',
    ],
    priority: 10,
  },
  { slug: 'marketing-sales', words: ['بازاریابی', 'دیجیتال مارکتینگ'], priority: 9 },
  { slug: 'admin-management', words: ['نیروی اداری', 'کار اداری', 'استخدام اداری'], priority: 9 },
  { slug: 'engineering', words: ['مهندس برق', 'مهندس مکانیک', 'مهندس صنایع'], priority: 9 },
  { slug: 'it', words: ['استخدام برنامه', 'برنامه نویس', 'فرانت', 'بک اند', 'فناوری اطلاعات'], priority: 9 },
  { slug: 'repairs', words: ['تعمیرکار', 'تعمیر', 'کولر', 'یخچال فوری'], priority: 8 },
  {
    slug: 'vehicle-repair',
    words: [
      'تعمیرکار خودرو',
      'تعمیرکار ماشین',
      'مکانیک خودرو',
      'تعمیر خودرو',
      'تعمیر موتور',
    ],
    priority: 16,
  },
  { slug: 'cleaning', words: ['نظافت', 'نظافتچی'], priority: 8 },
  { slug: 'plumbing', words: ['لوله', 'لوله‌کشی', 'تاسیسات', 'نشتی آب'], priority: 8 },
  { slug: 'moving', words: ['اسباب کشی', 'اسباب‌کشی', 'باربری', 'اسبابکشی', 'وانت باربری'], priority: 8 },
  { slug: 'transportation', words: ['حمل و نقل', 'دربستی'], priority: 7 },
  { slug: 'electrical', words: ['برقکار', 'برق‌کار', 'سیم کشی'], priority: 8 },
  { slug: 'painting', words: ['نقاش ساختمان', 'نقاشی ساختمان', 'نقاش', 'کاغذ دیواری'], priority: 8 },
  { slug: 'medical-health', words: ['پزشک', 'دندانپزشک', 'ویزیت', 'متخصص پوست'], priority: 8 },
  { slug: 'legal-services', words: ['وکیل', 'حقوقی', 'دادگاه', 'پرونده'], priority: 8 },
  { slug: 'it-services', words: ['طراحی سایت', 'ساخت اپ', 'سئو'], priority: 8 },
  { slug: 'education', words: ['معلم', 'تدریس', 'آموزش', 'خصوصی'], priority: 8 },
  { slug: 'beauty-health', words: ['آرایشگر', 'عروس', 'آرایش'], priority: 8 },
  { slug: 'spare-parts', words: ['قطعه یدکی', 'یدکی'], priority: 8 },
  {
    slug: 'apartment-sale',
    words: ['خونه', 'خانه', 'پارکینگ آپارتمان'],
    priority: 7,
  },
];

/** @deprecated Use rules registry packs; kept for migration and generator import. */
export const LEGACY_CATEGORY_KEYWORDS = CATEGORY_KEYWORDS;

export interface SuggestedCategoryCandidate {
  slug: string;
  score: number;
}

const DESIRE_ONLY =
  /^(میخوام|میخواهم|میخرم|نیاز دارم|دنبال|میخام|میخام)$/;

function hasCategoryKeywordHit(text: string): boolean {
  return CATEGORY_KEYWORDS.some((row) => row.words.some((w) => text.includes(w)));
}

function isDesireOnly(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (hasConcreteProductNoun(t)) return false;
  if (
    t.includes('ملک') ||
    t.includes('آپارت') ||
    t.includes('خونه') ||
    t.includes('زمین') ||
    t.includes('رهن') ||
    t.includes('ودیعه') ||
    t.includes('مشارکت') ||
    t.includes('پیش‌خرید') ||
    t.includes('پیش خرید') ||
    t.includes('سرمایه')
  ) {
    return false;
  }
  if (DESIRE_ONLY.test(t)) return true;
  if (t.length <= 12 && ALL_BUY_HINT_KEYWORDS.some((w) => t === w || t === w.replace('‌', ''))) {
    return true;
  }
  if (t.length < 28 && ALL_BUY_HINT_KEYWORDS.some((w) => t.includes(w)) && !hasCategoryKeywordHit(t)) {
    return true;
  }
  return false;
}

function parseBudget(text: string): { min?: number; max?: number } {
  const norm = withAsciiDigitRuns(text);
  const hasRahn = /(?<![\u0600-\u06FF])رهن(?!گیری|گ)|ودیعه/u.test(norm);
  const hasRent = /اجاره/u.test(norm);

  if (hasRahn) {
    const slots = extractPropertySlotsFromText(text);
    if (slots.rahnAmount) {
      return { max: Number(slots.rahnAmount) };
    }
    if (hasRent) {
      return {};
    }
  }

  const budgetLine = norm.match(/بودجه\s*(?:حدود|تا)?\s*(\d[\d,]*)\s*تومان/u);
  if (budgetLine) {
    const n = Number(budgetLine[1].replace(/,/g, ''));
    if (n > 0) return { max: n };
  }

  const millionMatch = norm.match(/(\d[\d,]*(?:\.\d+)?)\s*میلیون/u);
  const billionMatch = norm.match(/(\d[\d,]*(?:\.\d+)?)\s*میلیارد/u);
  const tomanMatch = norm.match(/(\d[\d,]*)\s*تومان/u);
  const plainNum = norm.match(/تا\s*(\d[\d,]*)/);

  if (billionMatch) {
    const n = Number(billionMatch[1].replace(/,/g, ''));
    if (n > 0) return { max: Math.round(n * 1_000_000_000) };
  }
  if (millionMatch) {
    const n = Number(millionMatch[1].replace(/,/g, ''));
    if (n > 0) return { max: Math.round(n * 1_000_000) };
  }
  if (tomanMatch) {
    const n = Number(tomanMatch[1].replace(/,/g, ''));
    return { max: n };
  }
  if (plainNum) {
    const n = Number(plainNum[1].replace(/,/g, ''));
    if (n < 10_000) return { max: n * 1_000_000 };
    return { max: n };
  }
  return {};
}

export function parseCity(text: string): string | undefined {
  const cityLine = text.match(/شهر\s*:\s*([\u0600-\u06FFa-z-]+)/i);
  if (cityLine?.[1]) {
    const slug = cityLine[1].trim().toLowerCase();
    const hit = CANONICAL_CITIES.find((c) => c.slug === slug || c.title === cityLine[1].trim());
    if (hit) return hit.title;
  }

  // Explicit «شهر X» / «شهر X،» beats neighborhood→city inference (e.g. حکم‌آباد→تبریز
  // when the user wrote «شهر الوند»). Skip «شهرک …» (no space after شهر).
  // Do not capture Persian/ASCII commas — they sit in the \u0600–\u06FF range.
  const labeledCity = text.match(
    /(?:^|[\s،,])\s*شهر\s+([\u0600-\u06FF\u200c\-]+?)(?=[\s،,]|$)/u
  );
  if (labeledCity?.[1]) {
    const name = labeledCity[1].trim().replace(/[،,]+$/u, '');
    if (name.length >= 2 && name !== 'ک') {
      const hit = CANONICAL_CITIES.find((c) => c.title === name || c.slug === name);
      return hit?.title ?? name;
    }
  }

  const letter = /[\u0600-\u06FFa-z0-9]/i;
  const matches: { title: string; length: number }[] = [];

  for (const city of CANONICAL_CITIES) {
    for (const term of [city.title, city.slug]) {
      const idx = text.indexOf(term);
      if (idx < 0) continue;
      const before = idx > 0 ? text[idx - 1]! : ' ';
      const after = idx + term.length < text.length ? text[idx + term.length]! : ' ';
      if (letter.test(before) || letter.test(after)) continue;
      matches.push({ title: city.title, length: term.length });
    }
  }

  if (matches.length > 0) {
    matches.sort((a, b) => b.length - a.length);
    return matches[0]!.title;
  }

  if (text.includes('فرامرز')) return 'مشهد';
  if (text.includes('اندیشه') || text.includes('فرحزادی') || text.includes('شمال تهران')) {
    return 'تهران';
  }
  if (/منطقه\s*[۰-۹0-9]/u.test(text)) return 'تهران';
  if (text.includes('کیش')) return 'کیش';
  if (text.includes('تهران') || text.includes('غرب')) return 'تهران';
  if (text.includes('اصفهان')) return 'اصفهان';
  if (text.includes('مشهد')) return 'مشهد';
  if (text.includes('شیراز')) return 'شیراز';
  return undefined;
}

function categoryKeywordMatches(text: string, word: string): boolean {
  const w = normalizeIntakeText(word);
  if (!w) return false;
  if (w.length > 3) return text.includes(w);
  const idx = text.indexOf(w);
  if (idx < 0) return false;
  const before = idx > 0 ? text[idx - 1] : ' ';
  const after = idx + w.length < text.length ? text[idx + w.length] : ' ';
  const letter = /[\u0600-\u06FFa-z]/i;
  if (letter.test(before) || letter.test(after)) return false;
  return true;
}

function detectCategorySlugFromKeywords(text: string): string | null {
  const repairSlug = detectRepairServiceCategory(text);
  if (repairSlug) return repairSlug;

  if (isAmbiguousCommercialSubtype(text)) return null;

  const businessCommercialSlug = detectBusinessCommercialCategory(text);
  if (businessCommercialSlug) return businessCommercialSlug;

  if (text.includes('نقاش') && !text.includes('فروش')) return 'painting';
  if (text.includes('وکیل')) return 'legal-services';
  if (text.includes('معلم') || text.includes('تدریس')) return 'education';
  if (text.includes('آرایشگر') && !isBusinessCommercialPropertyIntent(text)) {
    return 'beauty-health';
  }

  if (text.includes('استخدام') && text.includes('نظافت')) {
    return 'admin-management';
  }
  if (text.includes('استخدام') && text.includes('بازاریاب')) {
    return 'marketing-sales';
  }
  if (text.includes('استخدام') && text.includes('مهندس')) {
    return 'engineering';
  }
  if (text.includes('استخدام') && text.includes('اداری')) {
    return 'admin-management';
  }
  if (
    text.includes('استخدام') &&
    (text.includes('برنامه') || text.includes('فناوری') || text.includes('توسعه'))
  ) {
    return 'it';
  }

  let best: { slug: string; priority: number } | null = null;
  for (const row of CATEGORY_KEYWORDS) {
    if (
      isBusinessCommercialPropertyIntent(text) &&
      (row.slug === 'beauty-health' || row.slug === 'apartment-rent')
    ) {
      continue;
    }
    if (row.words.some((w) => categoryKeywordMatches(text, w))) {
      if (!best || row.priority > best.priority) {
        best = { slug: row.slug, priority: row.priority };
      }
    }
  }
  if (best) return best.slug;

  for (const cat of CANONICAL_CATEGORIES) {
    if (text.includes(cat.title.toLowerCase())) return cat.slug;
  }
  return null;
}

function isLikelyMotorcycleVehicleText(text: string): boolean {
  const t = normalizeIntakeText(text);
  if (!t.includes('موتور') && !t.includes('موتورسیکلت') && !t.includes('موتوسیکلت')) {
    return false;
  }
  if (REPAIR_KEYWORDS.some((w) => t.includes(w)) || t.includes('تعمیر موتور')) return false;
  if (t.includes('خودرو') || t.includes('ماشین')) return false;
  return true;
}

function detectCategorySlug(text: string, classification: VerticalClassification): string {
  if (isConstructionPartnershipText(text)) {
    return 'construction-partnership';
  }

  if (hasWatchOrLuxuryProductPhrase(text)) {
    return 'jewelry-watches';
  }

  if (hasPetProductPhrase(text)) {
    return 'pets';
  }

  if (isLikelyMotorcycleVehicleText(text)) {
    return 'motorcycle';
  }

  const fromKeywords = detectCategorySlugFromKeywords(text);
  if (fromKeywords) return fromKeywords;

  if (isLikelyProductPurchase(text) || hasGamingProductPhrase(text)) {
    return categorySlugForVertical('products', text);
  }

  if (isDesireOnly(text)) return 'services';

  if (text.includes('اجاره') && !text.includes('خودرو') && !text.includes('ماشین')) {
    if (isAmbiguousCommercialSubtype(text)) return 'commercial-rent';
    const businessRent = detectBusinessCommercialCategory(text);
    if (businessRent) return businessRent;
    if (isBusinessCommercialPropertyIntent(text)) return 'commercial-rent';
    if (text.includes('مغازه')) return 'shop-rent';
    if (text.includes('ویلا') || text.includes('خانه')) return 'villa-rent';
    if (text.includes('زمین') || text.includes('کلنگی')) return 'land-rent';
    if (text.includes('دفتر')) return 'office-rent';
    if (text.includes('سوله') || text.includes('صنعتی')) return 'industrial-rent';
    return 'apartment-rent';
  }

  if (isVerticalConfident(classification) || classification.score > 0) {
    return categorySlugForVertical(classification.vertical, text);
  }

  if (ALL_BUY_HINT_KEYWORDS.some((w) => text.includes(w))) {
    if (hasPetProductPhrase(text)) return 'pets';
    return categorySlugForVertical('products', text);
  }

  return 'services';
}

function isShortTermRentText(text: string): boolean {
  if (RENT_SHORT_TERM_KEYWORDS.some((w) => text.includes(w))) return true;
  // Do not treat «شبانه‌روزی» / «نفرستید» as nightly rent (colloquial-0165).
  if (/هر\s*شب|تومان\s*شب|(?:اجاره|سوئیت|ویلا)\s*شبانه(?!\u200c?روزی)/u.test(text)) {
    return true;
  }
  if (/\d+\s*شب/u.test(text) && /اجاره|سوئیت|ویلا|اتاق/u.test(text)) return true;
  return false;
}

function parsePropertyDealType(text: string): string | undefined {
  if (NEED_SEEKER_OPENER.test(text) && /فروش(?!ی)/u.test(text)) {
    const sellerExplicit =
      /می\s*فروش|میفروش|فروشنده|فروش\s*دم|اجاره\s*بدم|رهن\s*بدم|آگهی\s*فروش/u.test(text);
    if (!sellerExplicit) return 'buy';
  }
  if (isLandlordOfferRent(text)) {
    return 'sell';
  }
  // Explicit buy beats weak short-term false positives (e.g. داروخانه شبانه‌روزی).
  if (
    /(?:دنبال\s*)?خرید|قصد\s*خرید|(?<!ن)می\s*خوام[\s\p{L}\d]{0,40}?بخرم/u.test(text) &&
    !isShortTermRentText(text)
  ) {
    return 'buy';
  }
  // Short-term beats rahn+ejare so «کد رهگیری» cannot flip اجاره کوتاه‌مدت.
  if (isShortTermRentText(text)) return 'rent_short_term';
  if (isTenantSeekerRahnEjare(text) || isSeekerRahnEjareDeal(text)) {
    return 'rent_rahn_ejare';
  }
  if (isLandlordOfferRahn(text)) {
    return 'sell';
  }
  if (text.includes('اجاره بدم') || text.includes('اجاره دادن') || text.includes('اجاره دادنی')) {
    return 'sell';
  }
  if (text.includes('رهن بدم') || text.includes('رهن می‌دم') || text.includes('رهن میدم') || text.includes('رهن می دم')) {
    return 'sell';
  }
  const hasRahn = /(?<![\u0600-\u06FF])رهن(?!گیری|گ)|ودیعه/u.test(text);
  let hasRent =
    text.includes('اجاره') || RENT_MONTHLY_KEYWORDS.some((w) => text.includes(w));
  if (text.includes('نه اجاره')) hasRent = false;
  if (text.includes('اجاره ندارم') && hasRahn) return 'rent_rahn_full';
  if (/رهن\s*\d+\s*اجاره\s*\d+/u.test(text)) return 'rent_rahn_ejare';
  if (hasRahn && hasRent) return 'rent_rahn_ejare';
  if (RAHN_FULL_KEYWORDS.some((w) => text.includes(w))) return 'rent_rahn_full';
  if (RAHN_EJARE_KEYWORDS.some((w) => text.includes(w))) return 'rent_rahn_ejare';
  if (RENT_MONTHLY_KEYWORDS.some((w) => text.includes(w))) return 'rent_monthly';
  if (textHasSellKeyword(text)) return 'sell';
  if (hasRahn && text.includes('اجاره ندارم')) return 'rent_rahn_full';
  // Rahn-only seeker (no rent signal anywhere, no landlord phrase): the user
  // quoted a deposit budget only — that is a full-deposit (رهن کامل) need,
  // not deposit+rent.
  if (hasRahn && !text.includes('بدم')) return 'rent_rahn_full';
  if (textHasRentKeyword(text) || hasRent) return 'rent_monthly';
  if (BUY_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  if (NEED_SEEKER_OPENER.test(text) && hasPropertyContext(text)) return 'buy';
  if (text.includes('بگیرم') || text.includes('پول دارم')) return 'buy';
  return undefined;
}

function parseVehicleDealType(text: string): string | undefined {
  if (REPAIR_KEYWORDS.some((w) => text.includes(w))) return 'service';
  if (text.includes('یدکی') || text.includes('قطعه')) return 'parts';
  if (textHasSellKeyword(text)) return 'sell';
  if (textHasRentKeyword(text)) return 'rent';
  if (BUY_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  if (WANT_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  return undefined;
}

function parseProductDealType(text: string): string | undefined {
  if (textHasSellKeyword(text)) return 'sell';
  if (BUY_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  if (WANT_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  return undefined;
}

const PROPERTY_KIND_PREFIX: Record<string, string> = {
  apartment: 'apartment',
  villa: 'villa',
  land: 'land',
  office: 'office',
  shop: 'shop',
  industrial: 'industrial',
};

/** Map dealType + propertyKind → leaf category slug when taxonomy leaf exists. */
export function refinePropertyCategorySlug(
  slug: string,
  entities: Record<string, string>,
  text?: string
): string {
  if (text && isConstructionPartnershipText(text)) return slug;
  const path = getCategoryPath(slug);
  if (path.some((p) => p.slug === 'real-estate-services')) return slug;

  const deal = entities.dealType;
  const kind = entities.propertyKind ?? (text ? parsePropertyKind(text) : undefined);
  if (!kind) return slug;

  const prefix = PROPERTY_KIND_PREFIX[kind];
  if (!prefix) return slug;

  const isRent =
    deal === 'rent' ||
    deal === 'rent_monthly' ||
    deal === 'rent_rahn_full' ||
    deal === 'rent_rahn_ejare';
  const isShortTerm = deal === 'rent_short_term';
  const isSale = deal === 'buy' || deal === 'sell';

  if (isShortTerm) {
    if (kind === 'villa' && getCategoryBySlug('villa-short-rent')) return 'villa-short-rent';
    if (kind === 'office' && getCategoryBySlug('workspace-short-rent')) {
      return 'workspace-short-rent';
    }
    if (getCategoryBySlug('suite-apartment-rent')) return 'suite-apartment-rent';
  }

  if (isRent) {
    const target = `${prefix}-rent`;
    if (getCategoryBySlug(target)) return target;
  }
  if (isSale) {
    const target = `${prefix}-sale`;
    if (getCategoryBySlug(target)) return target;
  }
  return slug;
}

function parsePropertyKind(text: string): string | undefined {
  const norm = withAsciiDigitRuns(text);
  if (isBusinessCommercialPropertyIntent(norm)) {
    if (norm.includes('مغازه') || norm.includes('غرفه') || norm.includes('فروشگاه')) {
      return 'shop';
    }
    if (norm.includes('دفتر') || norm.includes('مطب') || norm.includes('کلینیک')) {
      return 'office';
    }
    if (
      norm.includes('سوله') ||
      /(?:^|[\s،,؛(])انبار(?:ها(?:ی)?)?(?=$|[\s،,؛).])/u.test(norm)
    ) return 'industrial';
    if (isAmbiguousCommercialSubtype(norm)) return undefined;
    if (
      norm.includes('سالن') ||
      norm.includes('مزون') ||
      norm.includes('بوتیک') ||
      norm.includes('کافه')
    ) {
      return 'shop';
    }
  }
  if (norm.includes('مجرد') || norm.includes('سوئیت')) return 'apartment';
  if (norm.includes('پنت') || norm.includes('برج')) return 'apartment';
  if (norm.includes('آپارتمانی') || norm.includes('آپارتمان') || norm.includes('آپارت')) {
    return 'apartment';
  }
  if (norm.includes('خانه ویلایی')) return 'villa';
  if (norm.includes('زمین') || norm.includes('کلنگی') || norm.includes('باغ') || norm.includes('مزرعه')) {
    return 'land';
  }
  if (norm.includes('ویلا') || norm.includes('ویلایی')) return 'villa';
  if (norm.includes('سوله') || norm.includes('کارگاه')) return 'industrial';
  if (norm.includes('انبار') && !norm.includes('انباری')) return 'industrial';
  if (norm.includes('دفتر') || norm.includes('اداری') || norm.includes('کلینیک')) return 'office';
  if (norm.includes('مغازه') || norm.includes('کیوسک')) return 'shop';
  if (norm.includes('خونه') || norm.includes('خانه')) return 'apartment';
  if (norm.includes('واحد') || norm.includes('ملک مسکونی')) return 'apartment';
  if (/\d{1,5}\s*مت(?:ر|ری)/u.test(norm)) return 'apartment';
  if (/\d{1,5}\s*متر(?:\s|$|\/|،)/u.test(norm)) return 'apartment';
  return undefined;
}

function detectIntent(
  text: string,
  categorySlug: string,
  classification: VerticalClassification
): IntentType {
  if (isDesireOnly(text) || (text.length < 8 && !isVerticalConfident(classification))) {
    return 'general';
  }

  const allowed = getIntentsForCategory(categorySlug);
  const path = getCategoryPath(categorySlug);
  const root = path[0]?.slug ?? categorySlug;

  if (categorySlug === 'construction-partnership' || isConstructionPartnershipText(text)) {
    if (allowed.includes('real_estate_service')) return 'real_estate_service';
  }

  if (
    root === 'real-estate' ||
    categorySlug.includes('apartment') ||
    categorySlug.includes('rent') ||
    classification.vertical === 'real-estate'
  ) {
    const deal = parsePropertyDealType(text);
    if (deal === 'sell' && allowed.includes('property_listing')) return 'property_listing';
    if (allowed.includes('property_search')) return 'property_search';
  }

  if (root === 'vehicles' || classification.vertical === 'vehicles') {
    if (parseVehicleDealType(text) === 'service' && allowed.includes('vehicle_service')) {
      return 'vehicle_service';
    }
    if (textHasSellKeyword(text) && allowed.includes('vehicle_listing')) {
      return 'vehicle_listing';
    }
    if (allowed.includes('vehicle_search')) return 'vehicle_search';
  }

  if (root === 'jobs' || text.includes('استخدام') || text.includes('نیاز به نیرو')) {
    return allowed.includes('job_search') ? 'job_search' : allowed[0];
  }

  if (REPAIR_KEYWORDS.some((w) => text.includes(w)) && classification.vertical === 'services') {
    if (allowed.includes('service_request')) return 'service_request';
    if (allowed.includes('vehicle_service')) return 'vehicle_service';
  }

  if (textHasSellKeyword(text)) {
    if (allowed.includes('product_listing')) return 'product_listing';
    if (allowed.includes('vehicle_listing')) return 'vehicle_listing';
    if (allowed.includes('property_listing')) return 'property_listing';
  }

  if (classification.vertical === 'real-estate' && allowed.includes('property_search')) {
    return 'property_search';
  }

  if (classification.vertical === 'products' && allowed.includes('product_search')) {
    return 'product_search';
  }

  if (classification.vertical === 'vehicles' && allowed.includes('vehicle_search')) {
    return 'vehicle_search';
  }

  const hasConcreteBuy =
    ALL_BUY_HINT_KEYWORDS.some((w) => text.includes(w)) &&
    classification.vertical !== 'services';
  if (hasConcreteBuy) {
    if (allowed.includes('property_search')) return 'property_search';
    if (allowed.includes('product_search')) return 'product_search';
    if (allowed.includes('vehicle_search')) return 'vehicle_search';
  }

  return allowed[0] ?? DEFAULT_INTENT;
}

function buildEntities(
  text: string,
  categorySlug: string,
  intentType: IntentType
): Record<string, string> {
  const entities: Record<string, string> = {};
  const path = getCategoryPath(categorySlug);
  const root = path[0]?.slug ?? categorySlug;

  const area = parseAreaFromText(text);
  if (area) {
    const numericArea = Number(area.replace(/,/g, '').trim());
    if (Number.isFinite(numericArea) && numericArea > 0) {
      // Legacy projection name; canonical storage is entities.area.
      entities.areaMin = String(numericArea);
    } else {
      // Location fragments are neighborhoods, never metric area.
      entities.neighborhood = area;
    }
  }

  if (categorySlug === 'construction-partnership' || isConstructionPartnershipText(text)) {
    entities.serviceKind = 'partnership';
    entities.dealType = 'partnership';
    const kind = parsePropertyKind(text);
    if (kind) entities.propertyKind = kind;
  } else if (root === 'real-estate' || intentType.startsWith('property')) {
    const deal = parsePropertyDealType(text);
    if (deal) entities.dealType = deal;
    const kind = parsePropertyKind(text);
    if (kind) entities.propertyKind = kind;
    // Do not force deal type from generic desire phrases (e.g. "میخوام آپارتمان").
    // We only set dealType when explicit buy/sell/rent/rahn signals exist.
  }

  if (root === 'vehicles' || intentType.startsWith('vehicle')) {
    const deal = parseVehicleDealType(text);
    if (deal) entities.dealType = deal;
    if (text.includes('موتورسیکلت')) entities.vehicleKind = 'motorcycle';
    const brand = extractVehicleSubjectFromText(text);
    if (brand) entities.brand = brand;
  }

  if (
    intentType === 'product_search' ||
    intentType === 'product_listing' ||
    ['electronics', 'home-appliances', 'personal-items', 'entertainment'].includes(root)
  ) {
    const deal = parseProductDealType(text);
    if (deal) entities.dealType = deal;
  }

  if (intentType === 'job_search') {
    if (text.includes('استخدام') || text.includes('نیرو')) entities.roleType = 'hiring';
    if (text.includes('کار پیدا') || text.includes('جویای کار')) entities.roleType = 'seeking';
  }

  if (root === 'services' || intentType === 'service_request') {
    if (text.includes('تعمیر') || text.includes('کولر')) entities.serviceCategory = 'repairs';
    if (text.includes('نظافت')) entities.serviceCategory = 'cleaning';
    if (text.includes('لوله')) entities.serviceCategory = 'plumbing';
    if (text.includes('اسباب')) entities.serviceCategory = 'moving';
    if (text.includes('برق')) entities.serviceCategory = 'electrical';
    if (text.includes('نقاش')) entities.serviceCategory = 'painting';
  }

  if (root === 'social') {
    if (text.includes('گم') || text.includes('پیدا')) entities.socialType = 'lost';
    if (text.includes('داوطلب')) entities.socialType = 'volunteer';
    if (text.includes('رویداد') || text.includes('همایش')) entities.socialType = 'event';
  }

  return entities;
}

function buildTitle(
  intent: IntentType,
  entities: Record<string, string>,
  city?: string,
  area?: string
): string {
  if (intent.startsWith('property')) {
    return buildPropertyTitle(intent, entities, city, area);
  }
  const labels: Record<string, string> = {
    vehicle_search: 'جستجوی خودرو',
    property_search: 'جستجوی ملک',
    product_search: 'جستجوی کالا',
    service_request: 'درخواست خدمات',
    job_search: 'آگهی استخدام',
  };
  return labels[intent] ?? 'ثبت نیاز';
}

function buildDescription(rawText: string, entities: Record<string, string>, city?: string): string {
  const area = entities.areaMin;
  const neighborhood = entities.neighborhood;
  const hints: string[] = [];
  if (neighborhood && city) hints.push(`محدوده: ${neighborhood}، ${city}`);
  else if (neighborhood) hints.push(`محدوده: ${neighborhood}`);
  if (area) hints.push(`متراژ: ${area} متر`);
  else if (city) hints.push(`شهر: ${city}`);
  const base = rawText.trim();
  if (hints.length === 0) return base;
  return `${base}\n${hints.join(' · ')}`.trim();
}

export function parseIntentFromText(rawText: string): ParsedIntent {
  const text = normalizeIntakeText(rawText);
  const classification = classifyVertical(rawText);
  const commercialAmbiguous = isAmbiguousCommercialSubtype(text);
  let categorySlug = detectCategorySlug(text, classification);
  const intentCategorySlug = commercialAmbiguous ? 'commercial-rent' : categorySlug;
  const intentType = detectIntent(text, intentCategorySlug, classification);
  const budget = parseBudget(text);
  const city = parseCity(text);
  const urgent = URGENT_KEYWORDS.some((w) => text.includes(w));
  const entities = buildEntities(text, categorySlug, intentType);
  categorySlug = refinePropertyCategorySlug(categorySlug, entities, text);
  if (
    intentType.startsWith('property') ||
    getCategoryPath(categorySlug)[0]?.slug === 'real-estate'
  ) {
    const slots = extractPropertySlotsFromText(rawText);
    if (slots.areaMin && !entities.areaMin) entities.areaMin = slots.areaMin;
    if (slots.areaMax && !entities.areaMax) entities.areaMax = slots.areaMax;
    if (slots.rooms && !entities.rooms) entities.rooms = slots.rooms;
  }
  const area = entities.areaMin;

  let confidence = 0.5;
  if (categorySlug !== 'services') confidence += 0.1;
  if (entities.dealType) confidence += 0.12;
  if (entities.propertyKind) confidence += 0.08;
  if (budget.max) confidence += 0.06;
  if (city) confidence += 0.06;
  if (area) confidence += 0.08;
  if (rawText.trim().length > 15) confidence += 0.05;
  if (isVerticalConfident(classification)) confidence += 0.15;
  confidence = Math.min(confidence, 0.95);

  const pair = normalizeCategoryPair(categorySlug);

  return {
    intentType,
    categorySlug: commercialAmbiguous ? '' : pair.categorySlug,
    subcategorySlug: commercialAmbiguous ? undefined : pair.subcategorySlug,
    title: buildTitle(intentType, entities, city, entities.neighborhood),
    description: buildDescription(rawText, entities, city),
    budgetMin: budget.min,
    budgetMax: budget.max,
    city,
    urgency: urgent ? 'URGENT' : 'NORMAL',
    confidence,
    entities,
    rawText: rawText.trim(),
  };
}

/** Expose classification for API / coherence layer. */
export function classifyNeedVertical(rawText: string): VerticalClassification {
  return classifyVertical(rawText);
}

export function resolveCategorySlugFromLegacy(value: string): string | null {
  return legacyValueToSlug(value);
}

export function getCategoryPathSlugs(slug: string): string[] {
  return getCategoryPath(slug).map((c) => c.slug);
}

/**
 * Deterministic (non-AI) category suggestions from raw user text.
 * Offline / client fallback when the server did not return categoryCandidates.
 * Live analyze uses the registry + category-intent-engine instead.
 */
export function suggestNeedCategoriesFromText(
  rawText: string,
  limit = 4
): SuggestedCategoryCandidate[] {
  const text = normalizeIntakeText(rawText);
  const candidates: SuggestedCategoryCandidate[] = [];
  const seen = new Set<string>();

  const repairSlug = detectRepairServiceCategory(text);
  if (repairSlug) {
    candidates.push({ slug: repairSlug, score: 200 });
    seen.add(repairSlug);
  }

  const commercialCandidates = getBusinessCommercialPropertyCandidates(text);
  for (const slug of commercialCandidates) {
    if (!seen.has(slug)) {
      candidates.push({ slug, score: 210 });
      seen.add(slug);
    }
  }
  const commercialIntent = commercialCandidates.length > 0;

  for (const row of CATEGORY_KEYWORDS) {
    if (
      (repairSlug || commercialIntent) &&
      (row.slug === 'car' ||
        row.slug === 'car-ride' ||
        row.slug === 'motorcycle' ||
        row.slug === 'spare-parts' ||
        row.slug === 'apartment-rent' ||
        row.slug === 'beauty-health')
    ) {
      continue;
    }
    let hits = 0;
    for (const w of row.words) {
      if (text.includes(w)) hits += 1;
    }
    if (!hits) continue;
    const score = row.priority * 10 + hits;
    if (!seen.has(row.slug)) {
      candidates.push({ slug: row.slug, score });
      seen.add(row.slug);
    }
  }

  const classification = classifyVertical(rawText);
  const fallback = categorySlugForVertical(classification.vertical, text);
  if (fallback && !seen.has(fallback) && !repairSlug) {
    candidates.push({ slug: fallback, score: 40 + Math.round(classification.score * 10) });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, Math.max(1, limit));
}
