import type { IntentType, ParsedIntent } from '@/contracts/need-intake';
import {
  DEFAULT_INTENT,
  getIntentsForCategory,
} from '@/config/need-intents';
import { CANONICAL_CITIES } from '@/config/locations';
import {
  CANONICAL_CATEGORIES,
  getCategoryPath,
  legacyValueToSlug,
  normalizeCategoryPair,
} from '@/config/categories';
import {
  categorySlugForVertical,
  classifyVertical,
  isVerticalConfident,
  parseAreaFromText,
  type VerticalClassification,
} from '@/lib/need-intake/vertical-classifier';

const BUY_KEYWORDS = ['می‌خرم', 'میخرم', 'میخوام', 'میخواهم', 'نیاز دارم', 'دنبال', 'جستجو', 'پیدا کن', 'خرید'];
const SELL_KEYWORDS = ['می‌فروشم', 'میفروشم', 'فروش', 'آگهی', 'فروشنده'];
const RENT_KEYWORDS = ['اجاره', 'رنت', 'اجاره‌ای', 'مستاجر'];
const REPAIR_KEYWORDS = ['تعمیر', 'تعمیرکار', 'نصب'];
const URGENT_KEYWORDS = ['فوری', 'سریع', 'امروز', 'الان'];

const RAHN_FULL_KEYWORDS = ['رهن کامل', 'فقط رهن'];
const RAHN_EJARE_KEYWORDS = ['رهن و اجاره', 'ودیعه و اجاره', 'ودیعه'];
const RENT_MONTHLY_KEYWORDS = ['اجاره ماهانه', 'اجاره ماهیانه'];

/** Category keyword hints → canonical slug (higher priority first). */
const CATEGORY_KEYWORDS: { slug: string; words: string[]; priority: number }[] = [
  { slug: 'agency-services', words: ['آژانس املاک', 'مشاور املاک'], priority: 10 },
  { slug: 'pre-sale-services', words: ['پیش فروش', 'پیش‌فروش', 'پروژه'], priority: 10 },
  { slug: 'apartment-rent', words: ['اجاره آپارتمان', 'رهن', 'ودیعه'], priority: 9 },
  {
    slug: 'apartment-sale',
    words: [
      'خرید آپارتمان',
      'فروش آپارتمان',
      'آپارتمان',
      'خانه',
      'خونه',
      'خونه',
      'ملک',
      'ویلا',
      'زمین',
      'سوئیت',
      'آپارت',
    ],
    priority: 9,
  },
  { slug: 'car', words: ['ماشین', 'خودرو', 'پژو', 'پراید', 'سمند', 'تیبا', 'دنا'], priority: 8 },
  { slug: 'mobile-phone', words: ['گوشی', 'آیفون', 'iphone', 'سامسونگ', 'شیائومی'], priority: 8 },
  { slug: 'laptop', words: ['لپ‌تاپ', 'لپ تاپ', 'macbook'], priority: 8 },
  { slug: 'game-console', words: ['ps5', 'playstation', 'پلی‌استیشن', 'xbox', 'کنسول'], priority: 7 },
  { slug: 'repairs', words: ['تعمیرکار', 'تعمیر', 'کولر'], priority: 7 },
  { slug: 'cleaning', words: ['نظافت', 'نظافتچی'], priority: 7 },
  { slug: 'plumbing', words: ['لوله', 'لوله‌کشی', 'تاسیسات'], priority: 7 },
  { slug: 'moving', words: ['اسباب کشی', 'اسباب‌کشی', 'باربری', 'اسبابکشی'], priority: 7 },
  { slug: 'electrical', words: ['برقکار', 'برق‌کار', 'برق کاری', 'سیم کشی'], priority: 7 },
  { slug: 'painting', words: ['نقاش', 'نقاشی', 'کاغذ دیواری'], priority: 7 },
  { slug: 'medical-health', words: ['پزشک', 'دندانپزشک', 'ویزیت'], priority: 6 },
  { slug: 'legal-services', words: ['وکیل', 'حقوقی', 'دادگاه'], priority: 6 },
  { slug: 'it-services', words: ['طراحی سایت', 'ساخت اپ', 'سئو سایت', 'توسعه نرم'], priority: 6 },
  { slug: 'it', words: ['استخدام برنامه', 'استخدام فناوری', 'جویای کار', 'نیاز به نیرو'], priority: 8 },
  { slug: 'lost-found', words: ['گم شده', 'گمشده', 'پیدا شد', 'گم کردم'], priority: 8 },
];

function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
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

function parseCity(text: string): string | undefined {
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
  const fromKeywords = detectCategorySlugFromKeywords(text);
  if (fromKeywords) return fromKeywords;

  if (isVerticalConfident(classification) || classification.score > 0) {
    return categorySlugForVertical(classification.vertical, text);
  }

  return 'services';
}

function parsePropertyDealType(text: string): string | undefined {
  if (RAHN_FULL_KEYWORDS.some((w) => text.includes(w))) return 'rent_rahn_full';
  if (RAHN_EJARE_KEYWORDS.some((w) => text.includes(w))) return 'rent_rahn_ejare';
  if (RENT_MONTHLY_KEYWORDS.some((w) => text.includes(w))) return 'rent_monthly';
  if (SELL_KEYWORDS.some((w) => text.includes(w))) return 'sell';
  if (RENT_KEYWORDS.some((w) => text.includes(w))) return 'rent_monthly';
  if (BUY_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  return undefined;
}

function parseVehicleDealType(text: string): string | undefined {
  if (REPAIR_KEYWORDS.some((w) => text.includes(w))) return 'service';
  if (text.includes('یدکی') || text.includes('قطعه')) return 'parts';
  if (SELL_KEYWORDS.some((w) => text.includes(w))) return 'sell';
  if (RENT_KEYWORDS.some((w) => text.includes(w))) return 'rent';
  if (BUY_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  return undefined;
}

function parseProductDealType(text: string): string | undefined {
  if (SELL_KEYWORDS.some((w) => text.includes(w))) return 'sell';
  if (BUY_KEYWORDS.some((w) => text.includes(w))) return 'buy';
  return undefined;
}

function parsePropertyKind(text: string): string | undefined {
  if (text.includes('آپارتمان') || text.includes('آپارت')) return 'apartment';
  if (text.includes('ویلا') || text.includes('خانه') || text.includes('خونه')) {
    return 'villa';
  }
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
  const allowed = getIntentsForCategory(categorySlug);
  const path = getCategoryPath(categorySlug);
  const root = path[0]?.slug ?? categorySlug;

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
    BUY_KEYWORDS.some((w) => text.includes(w)) &&
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

  if (root === 'real-estate' || intentType.startsWith('property')) {
    const deal = parsePropertyDealType(text);
    if (deal) entities.dealType = deal;
    const kind = parsePropertyKind(text);
    if (kind) entities.propertyKind = kind;
    if (!entities.dealType && (text.includes('میخوام') || text.includes('میخواهم'))) {
      entities.dealType = 'buy';
    }
  }

  if (root === 'vehicles' || intentType.startsWith('vehicle')) {
    const deal = parseVehicleDealType(text);
    if (deal) entities.dealType = deal;
    if (text.includes('موتور')) entities.vehicleKind = 'motorcycle';
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
  const deal = entities.dealType;
  const kind = entities.propertyKind;
  const parts: string[] = [];

  if (intent.startsWith('property')) {
    if (deal === 'rent_rahn_full') return 'جستجوی ملک — رهن کامل';
    if (deal === 'rent_rahn_ejare') return 'جستجوی ملک — رهن و اجاره';
    if (deal === 'rent_monthly') parts.push('اجاره');
    if (deal === 'buy') parts.push('خرید');
    if (deal === 'sell') parts.push('فروش');
    if (kind === 'apartment') parts.push('آپارتمان');
    else if (kind === 'villa') parts.push('خانه');
    else parts.push('ملک');
  } else {
    const labels: Record<string, string> = {
      vehicle_search: 'جستجوی خودرو',
      property_search: 'جستجوی ملک',
      product_search: 'جستجوی کالا',
      service_request: 'درخواست خدمات',
      job_search: 'آگهی استخدام',
    };
    return labels[intent] ?? 'ثبت نیاز';
  }

  if (area) parts.push(area);
  if (city) parts.push(city);
  return parts.join(' — ').slice(0, 80) || 'جستجوی ملک';
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
  const text = normalizeText(rawText);
  const classification = classifyVertical(rawText);
  const categorySlug = detectCategorySlug(text, classification);
  const intentType = detectIntent(text, categorySlug, classification);
  const budget = parseBudget(text);
  const city = parseCity(text);
  const urgent = URGENT_KEYWORDS.some((w) => text.includes(w));
  const entities = buildEntities(text, categorySlug, intentType);
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
