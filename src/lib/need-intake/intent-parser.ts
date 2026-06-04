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
import { buildPropertyTitle } from '@/lib/need-intake/property-title';
import {
  hasConcreteProductNoun,
  hasGamingProductPhrase,
  hasWatchOrLuxuryProductPhrase,
  isLikelyProductPurchase,
} from '@/lib/need-intake/product-buy-hints';
import { extractVehicleSubjectFromText } from '@/lib/need-intake/vertical-title';
import {
  categorySlugForVertical,
  classifyVertical,
  isVerticalConfident,
  parseAreaFromText,
  type VerticalClassification,
} from '@/lib/need-intake/vertical-classifier';

const WANT_KEYWORDS = ['میخوام', 'میخواهم', 'نیاز دارم', 'دنبال', 'جستجو', 'پیدا کن'];
const BUY_KEYWORDS = ['می‌خرم', 'میخرم', 'بخرم', 'خرید', 'میخرم'];
const ALL_BUY_HINT_KEYWORDS = [...WANT_KEYWORDS, ...BUY_KEYWORDS];
const SELL_KEYWORDS = ['می‌فروشم', 'میفروشم', 'فروش', 'آگهی', 'فروشنده'];
const RENT_KEYWORDS = ['اجاره', 'رنت', 'اجاره‌ای', 'مستاجر'];
const REPAIR_KEYWORDS = ['تعمیر', 'تعمیرکار', 'نصب'];
const URGENT_KEYWORDS = ['فوری', 'سریع', 'امروز', 'الان'];

const RAHN_FULL_KEYWORDS = ['رهن کامل', 'فقط رهن'];
const RAHN_EJARE_KEYWORDS = ['رهن و اجاره', 'ودیعه و اجاره', 'ودیعه'];
const RENT_MONTHLY_KEYWORDS = ['اجاره ماهانه', 'اجاره ماهیانه'];
const RENT_SHORT_TERM_KEYWORDS = [
  'اجاره روزانه',
  'روزانه',
  'کوتاه مدت',
  'کوتاه‌مدت',
  'هر شب',
  'تومان شب',
  'سوئیت',
];

/** مشارکت در ساخت / زمین برای ساخت — not buy/sell listing. */
export function isConstructionPartnershipText(text: string): boolean {
  const t = normalizeIntakeText(text);
  return (
    (t.includes('مشارکت') && (t.includes('ساخت') || t.includes('در ساخت'))) ||
    t.includes('مشارکت در ساخت') ||
    t.includes('مشارکت ساخت')
  );
}

/** Category keyword hints → canonical slug (higher priority first). */
const CATEGORY_KEYWORDS: { slug: string; words: string[]; priority: number }[] = [
  { slug: 'lost-found', words: ['گم شده', 'گمشده', 'گم کردم'], priority: 11 },
  {
    slug: 'construction-partnership',
    words: ['مشارکت در ساخت', 'مشارکت ساخت', 'مشارکت درساخت'],
    priority: 12,
  },
  { slug: 'agency-services', words: ['آژانس املاک', 'اژانس املاک', 'مشاور املاک'], priority: 10 },
  { slug: 'pre-sale-services', words: ['پیش فروش', 'پیش‌فروش', 'پیشفروش', 'پروژه'], priority: 10 },
  { slug: 'conference', words: ['همایش', 'سمینار', 'کنفرانس'], priority: 10 },
  { slug: 'motorcycle', words: ['موتور', 'موتورسیکلت', 'هوندا 125'], priority: 10 },
  { slug: 'boat', words: ['قایق', 'قایق تفریحی'], priority: 10 },
  { slug: 'refrigerator', words: ['یخچال', 'ساید بای ساید'], priority: 10 },
  { slug: 'sofa-chair', words: ['مبل', 'مبلمان', 'کاناپه'], priority: 10 },
  { slug: 'tickets', words: ['بلیط', 'بلیت'], priority: 10 },
  { slug: 'pets', words: ['گربه', 'سگ', 'حیوان خانگی'], priority: 10 },
  { slug: 'clothing', words: ['کت و شلوار', 'پوشاک', 'لباس'], priority: 10 },
  { slug: 'camera', words: ['دوربین', 'کانن', 'نیکون'], priority: 10 },
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
  { slug: 'shop-rent', words: ['اجاره مغازه', 'مغازه برای اجاره'], priority: 10 },
  { slug: 'office-sale', words: ['فروش دفتر', 'دفتر کار'], priority: 10 },
  { slug: 'industrial-sale', words: ['سوله', 'صنعتی', 'انبار صنعتی'], priority: 10 },
  {
    slug: 'suite-apartment-rent',
    words: ['اجاره روزانه', 'اجاره شبانه', 'سوئیت روزانه', 'آپارتمان روزانه'],
    priority: 11,
  },
  { slug: 'apartment-rent', words: ['اجاره آپارتمان', 'اجاره ماهانه', 'رهن', 'ودیعه', 'رهن و اجاره'], priority: 9 },
  { slug: 'apartment-sale', words: ['خرید آپارتمان', 'فروش آپارتمان'], priority: 8 },
  { slug: 'real-estate', words: ['آپارتمان', 'اپارتمان', 'آپارت', 'سوئیت', 'ملک مسکونی'], priority: 7 },
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
    words: ['خونه', 'خانه', 'ملک', 'پارکینگ آپارتمان'],
    priority: 7,
  },
];

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
  const millionMatch = text.match(/(\d+)\s*میلیون/);
  const tomanMatch = text.match(/(\d[\d,]*)\s*تومان/);
  const plainNum = text.match(/تا\s*(\d[\d,]*)/);

  if (millionMatch) {
    const n = Number(millionMatch[1]) * 1_000_000;
    return { max: n };
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
  for (const city of CANONICAL_CITIES) {
    if (text.includes(city.title) || text.includes(city.slug)) {
      return city.title;
    }
  }
  if (text.includes('تهران') || text.includes('غرب')) return 'تهران';
  if (text.includes('اصفهان')) return 'اصفهان';
  if (text.includes('مشهد')) return 'مشهد';
  if (text.includes('شیراز')) return 'شیراز';
  return undefined;
}

function detectCategorySlugFromKeywords(text: string): string | null {
  if (text.includes('تعمیر') || text.includes('تعمیرکار')) return 'repairs';
  if (text.includes('نقاش') && !text.includes('فروش')) return 'painting';
  if (text.includes('وکیل')) return 'legal-services';
  if (text.includes('معلم') || text.includes('تدریس')) return 'education';
  if (text.includes('آرایشگر')) return 'beauty-health';

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
    if (row.words.some((w) => text.includes(w))) {
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

function detectCategorySlug(text: string, classification: VerticalClassification): string {
  if (isConstructionPartnershipText(text)) {
    return 'construction-partnership';
  }

  if (hasWatchOrLuxuryProductPhrase(text)) {
    return 'jewelry-watches';
  }

  if (isLikelyProductPurchase(text) || hasGamingProductPhrase(text)) {
    return categorySlugForVertical('products', text);
  }

  if (isDesireOnly(text)) return 'services';

  const fromKeywords = detectCategorySlugFromKeywords(text);
  if (fromKeywords) return fromKeywords;

  if (text.includes('اجاره') && !text.includes('خودرو') && !text.includes('ماشین')) {
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
    return categorySlugForVertical('products', text);
  }

  return 'services';
}

function isShortTermRentText(text: string): boolean {
  if (RENT_SHORT_TERM_KEYWORDS.some((w) => text.includes(w))) return true;
  if (text.includes('شب') && (text.includes('اجاره') || text.includes('نفر'))) return true;
  return false;
}

function parsePropertyDealType(text: string): string | undefined {
  if (isShortTermRentText(text)) return 'rent_short_term';
  const hasRahn = text.includes('رهن') || text.includes('ودیعه');
  const hasRent = text.includes('اجاره') || RENT_MONTHLY_KEYWORDS.some((w) => text.includes(w));
  if (hasRahn && hasRent) return 'rent_rahn_ejare';
  if (RAHN_FULL_KEYWORDS.some((w) => text.includes(w))) return 'rent_rahn_full';
  if (RAHN_EJARE_KEYWORDS.some((w) => text.includes(w))) return 'rent_rahn_ejare';
  if (RENT_MONTHLY_KEYWORDS.some((w) => text.includes(w))) return 'rent_monthly';
  if (SELL_KEYWORDS.some((w) => text.includes(w))) return 'sell';
  if (hasRahn) return 'rent_rahn_ejare';
  if (RENT_KEYWORDS.some((w) => text.includes(w)) || hasRent) return 'rent_monthly';
  if (BUY_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  return undefined;
}

function parseVehicleDealType(text: string): string | undefined {
  if (REPAIR_KEYWORDS.some((w) => text.includes(w))) return 'service';
  if (text.includes('یدکی') || text.includes('قطعه')) return 'parts';
  if (SELL_KEYWORDS.some((w) => text.includes(w))) return 'sell';
  if (RENT_KEYWORDS.some((w) => text.includes(w))) return 'rent';
  if (BUY_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  if (WANT_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  return undefined;
}

function parseProductDealType(text: string): string | undefined {
  if (SELL_KEYWORDS.some((w) => text.includes(w))) return 'sell';
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
    deal === 'rent_monthly' || deal === 'rent_rahn_full' || deal === 'rent_rahn_ejare';
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
  if (text.includes('مجرد') || text.includes('سوئیت')) return 'apartment';
  if (text.includes('آپارتمانی') || text.includes('آپارتمان') || text.includes('آپارت')) {
    return 'apartment';
  }
  if (text.includes('ویلا') || text.includes('خانه ویلایی') || text.includes('ویلایی')) {
    return 'villa';
  }
  if (text.includes('خونه') || text.includes('خانه')) return 'apartment';
  if (text.includes('زمین') || text.includes('کلنگی')) return 'land';
  if (text.includes('دفتر')) return 'office';
  if (text.includes('مغازه')) return 'shop';
  if (text.includes('خونه') || text.includes('خانه')) return 'apartment';
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
    if (SELL_KEYWORDS.some((w) => text.includes(w)) && allowed.includes('vehicle_listing')) {
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

  if (SELL_KEYWORDS.some((w) => text.includes(w))) {
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
  if (area) entities.area = area;

  if (categorySlug === 'construction-partnership' || isConstructionPartnershipText(text)) {
    entities.serviceKind = 'partnership';
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
  const area = entities.area;
  const hints: string[] = [];
  if (area && city) hints.push(`محدوده: ${area}، ${city}`);
  else if (area) hints.push(`محدوده: ${area}`);
  else if (city) hints.push(`شهر: ${city}`);
  const base = rawText.trim();
  if (hints.length === 0) return base;
  return `${base}\n${hints.join(' · ')}`.trim();
}

export function parseIntentFromText(rawText: string): ParsedIntent {
  const text = normalizeIntakeText(rawText);
  const classification = classifyVertical(rawText);
  let categorySlug = detectCategorySlug(text, classification);
  const intentType = detectIntent(text, categorySlug, classification);
  const budget = parseBudget(text);
  const city = parseCity(text);
  const urgent = URGENT_KEYWORDS.some((w) => text.includes(w));
  const entities = buildEntities(text, categorySlug, intentType);
  categorySlug = refinePropertyCategorySlug(categorySlug, entities, text);
  const area = entities.area;

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
    categorySlug: pair.categorySlug,
    subcategorySlug: pair.subcategorySlug,
    title: buildTitle(intentType, entities, city, area),
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
 * Returns top unique canonical slugs sorted by score.
 */
export function suggestNeedCategoriesFromText(
  rawText: string,
  limit = 4
): SuggestedCategoryCandidate[] {
  const text = normalizeIntakeText(rawText);
  const candidates: SuggestedCategoryCandidate[] = [];
  const seen = new Set<string>();

  for (const row of CATEGORY_KEYWORDS) {
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
  if (fallback && !seen.has(fallback)) {
    candidates.push({ slug: fallback, score: 40 + Math.round(classification.score * 10) });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, Math.max(1, limit));
}
