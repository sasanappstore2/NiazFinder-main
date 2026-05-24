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
} from '@/config/categories';

const BUY_KEYWORDS = ['می‌خرم', 'میخرم', 'میخوام', 'میخواهم', 'نیاز دارم', 'دنبال', 'جستجو', 'پیدا کن', 'خرید'];
const SELL_KEYWORDS = ['می‌فروشم', 'میفروشم', 'فروش', 'آگهی', 'فروشنده'];
const RENT_KEYWORDS = ['اجاره', 'رنت', 'اجاره‌ای', 'مستاجر'];
const REPAIR_KEYWORDS = ['تعمیر', 'تعمیرکار', 'سرویس', 'خدمات', 'نصب'];
const URGENT_KEYWORDS = ['فوری', 'سریع', 'امروز', 'الان'];

const RAHN_FULL_KEYWORDS = ['رهن کامل', 'رهن کامل', 'فقط رهن'];
const RAHN_EJARE_KEYWORDS = ['رهن و اجاره', 'رهن و اجاره', 'ودیعه و اجاره', 'ودیعه'];
const RENT_MONTHLY_KEYWORDS = ['اجاره ماهانه', 'اجاره ماهیانه'];

/** Category keyword hints → canonical slug */
const CATEGORY_KEYWORDS: { slug: string; words: string[] }[] = [
  { slug: 'apartment-rent', words: ['اجاره آپارتمان', 'رهن', 'ودیعه'] },
  { slug: 'apartment-sale', words: ['خرید آپارتمان', 'فروش آپارتمان', 'آپارتمان', 'خانه', 'ملک', 'ویلا', 'زمین'] },
  { slug: 'car', words: ['ماشین', 'خودرو', 'پژو', 'پراید', 'سمند', 'تیبا', 'دنا'] },
  { slug: 'mobile-phone', words: ['گوشی', 'آیفون', 'iphone', 'سامسونگ', 'شیائومی'] },
  { slug: 'laptop', words: ['لپ‌تاپ', 'لپ تاپ', 'macbook'] },
  { slug: 'game-console', words: ['ps5', 'playstation', 'پلی‌استیشن', 'xbox', 'کنسول'] },
  { slug: 'repairs', words: ['تعمیر', 'تعمیرکار', 'کولر', 'اسباب کشی', 'اسباب‌کشی'] },
  { slug: 'cleaning', words: ['نظافت', 'نظافتچی'] },
  { slug: 'it', words: ['برنامه نویس', 'فریلنسر', 'استخدام', 'کار'] },
  { slug: 'lost-found', words: ['گم شده', 'گمشده', 'پیدا شد', 'گم کردم'] },
  { slug: 'pre-sale-services', words: ['پیش فروش', 'پیش‌فروش', 'پروژه'] },
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

function detectCategorySlug(text: string): string {
  for (const row of CATEGORY_KEYWORDS) {
    if (row.words.some((w) => text.includes(w))) return row.slug;
  }

  for (const cat of CANONICAL_CATEGORIES) {
    if (text.includes(cat.title.toLowerCase())) return cat.slug;
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
  if (text.includes('آپارتمان')) return 'apartment';
  if (text.includes('ویلا') || text.includes('خانه')) return 'villa';
  if (text.includes('زمین') || text.includes('کلنگی')) return 'land';
  if (text.includes('دفتر')) return 'office';
  if (text.includes('مغازه')) return 'shop';
  return undefined;
}

function detectIntent(text: string, categorySlug: string): IntentType {
  const allowed = getIntentsForCategory(categorySlug);
  const path = getCategoryPath(categorySlug);
  const root = path[0]?.slug ?? categorySlug;

  if (root === 'real-estate' || categorySlug.includes('apartment') || categorySlug.includes('rent')) {
    const deal = parsePropertyDealType(text);
    if (deal === 'sell' && allowed.includes('property_listing')) return 'property_listing';
    if (allowed.includes('property_search')) return 'property_search';
  }

  if (root === 'vehicles') {
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

  if (REPAIR_KEYWORDS.some((w) => text.includes(w))) {
    if (allowed.includes('service_request')) return 'service_request';
    if (allowed.includes('vehicle_service')) return 'vehicle_service';
  }

  if (SELL_KEYWORDS.some((w) => text.includes(w))) {
    if (allowed.includes('product_listing')) return 'product_listing';
    if (allowed.includes('vehicle_listing')) return 'vehicle_listing';
    if (allowed.includes('property_listing')) return 'property_listing';
  }

  if (BUY_KEYWORDS.some((w) => text.includes(w)) || text.includes('میخوام')) {
    if (allowed.includes('product_search')) return 'product_search';
    if (allowed.includes('vehicle_search')) return 'vehicle_search';
    if (allowed.includes('property_search')) return 'property_search';
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

  if (root === 'real-estate' || intentType.startsWith('property')) {
    const deal = parsePropertyDealType(text);
    if (deal) entities.dealType = deal;
    const kind = parsePropertyKind(text);
    if (kind) entities.propertyKind = kind;
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

  if (text.includes('تعمیر')) entities.serviceCategory = 'repairs';
  if (text.includes('نظافت')) entities.serviceCategory = 'cleaning';

  if (root === 'social') {
    if (text.includes('گم') || text.includes('پیدا')) entities.socialType = 'lost';
    if (text.includes('داوطلب')) entities.socialType = 'volunteer';
    if (text.includes('رویداد') || text.includes('همایش')) entities.socialType = 'event';
  }

  return entities;
}

function buildTitle(raw: string, intent: IntentType, entities: Record<string, string>): string {
  const trimmed = raw.trim().slice(0, 80);
  if (trimmed.length >= 10) return trimmed;

  const deal = entities.dealType;
  if (deal === 'rent_rahn_full') return 'درخواست ملک — رهن کامل';
  if (deal === 'rent_rahn_ejare') return 'درخواست ملک — رهن و اجاره';
  if (deal === 'buy') return 'جستجوی خرید';
  if (deal === 'sell') return 'ثبت آگهی فروش';

  const labels: Record<string, string> = {
    vehicle_search: 'جستجوی خودرو',
    property_search: 'جستجوی ملک',
    product_search: 'جستجوی کالا',
    service_request: 'درخواست خدمات',
    job_search: 'آگهی استخدام',
  };
  return labels[intent] ?? 'ثبت نیاز';
}

export function parseIntentFromText(rawText: string): ParsedIntent {
  const text = normalizeText(rawText);
  const categorySlug = detectCategorySlug(text);
  const intentType = detectIntent(text, categorySlug);
  const budget = parseBudget(text);
  const city = parseCity(text);
  const urgent = URGENT_KEYWORDS.some((w) => text.includes(w));
  const entities = buildEntities(text, categorySlug, intentType);

  let confidence = 0.55;
  if (categorySlug !== 'services') confidence += 0.12;
  if (entities.dealType) confidence += 0.15;
  if (budget.max) confidence += 0.08;
  if (city) confidence += 0.08;
  if (rawText.trim().length > 20) confidence += 0.08;
  confidence = Math.min(confidence, 0.95);

  return {
    intentType,
    categorySlug,
    title: buildTitle(rawText, intentType, entities),
    description: rawText.trim(),
    budgetMin: budget.min,
    budgetMax: budget.max,
    city,
    urgency: urgent ? 'URGENT' : 'NORMAL',
    confidence,
    entities,
    rawText: rawText.trim(),
  };
}

export function resolveCategorySlugFromLegacy(value: string): string | null {
  return legacyValueToSlug(value);
}

export function getCategoryPathSlugs(slug: string): string[] {
  return getCategoryPath(slug).map((c) => c.slug);
}
