import type { ParseVertical } from '@/lib/need-intake/parse-vertical';
import { CANONICAL_CITIES } from '@/config/locations';
import { hasBuyIntentPhrase, hasPetProductPhrase } from '@/lib/need-intake/product-buy-hints';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import {
  detectRepairServiceCategory,
  isVehicleRepairServiceIntent,
} from '@/lib/need-intake/service-repair-intent';

function stripTrailingCityFromArea(area: string): string {
  const trimmed = area.trim();
  for (const city of CANONICAL_CITIES) {
    if (trimmed === city.title) return trimmed;
    const suffix = ` ${city.title}`;
    if (trimmed.endsWith(suffix)) {
      const base = trimmed.slice(0, -suffix.length).trim();
      if (base.length >= 2) return base;
    }
  }
  return trimmed;
}

export type ClassifierVertical =
  | 'real-estate'
  | 'vehicles'
  | 'products'
  | 'services'
  | 'jobs'
  | 'social';

export interface VerticalClassification {
  vertical: ClassifierVertical;
  score: number;
  /** 0–1 normalized gap between top and second place */
  certainty: number;
  signals: string[];
  scores: Record<ClassifierVertical, number>;
}

const VERTICALS: ClassifierVertical[] = [
  'real-estate',
  'vehicles',
  'products',
  'services',
  'jobs',
  'social',
];

/** Strong property signals — "میخوام" alone does NOT count here. */
const REAL_ESTATE_SIGNALS: { word: string; weight: number }[] = [
  { word: 'خونه', weight: 4 },
  { word: 'خانه', weight: 4 },
  { word: 'آپارتمان', weight: 4 },
  { word: 'آپارت', weight: 3 },
  { word: 'ملک', weight: 4 },
  { word: 'ویلا', weight: 4 },
  { word: 'زمین', weight: 3 },
  { word: 'رهن', weight: 4 },
  { word: 'ودیعه', weight: 3 },
  { word: 'اجاره', weight: 3 },
  { word: 'متراژ', weight: 3 },
  { word: 'خواب', weight: 2 },
  { word: 'متری', weight: 2 },
  { word: 'متر', weight: 3 },
  { word: 'باغ', weight: 4 },
  { word: 'مزرعه', weight: 4 },
  { word: 'هکتار', weight: 4 },
  { word: 'محدوده', weight: 2 },
  { word: 'محله', weight: 2 },
  { word: 'منطقه', weight: 2 },
  { word: 'آژانس املاک', weight: 4 },
  { word: 'مشاور املاک', weight: 4 },
  { word: 'پیش فروش', weight: 3 },
  { word: 'پیش‌فروش', weight: 3 },
  { word: 'سوئیت', weight: 3 },
  { word: 'روزانه', weight: 4 },
  { word: 'کوتاه‌مدت', weight: 4 },
  { word: 'کوتاه مدت', weight: 4 },
  { word: 'شب', weight: 2 },
  { word: 'دفتر', weight: 2 },
  { word: 'مغازه', weight: 2 },
  { word: 'پنت', weight: 4 },
  { word: 'برج', weight: 3 },
  { word: 'طبقه', weight: 4 },
  { word: 'مستقل', weight: 3 },
  { word: 'واحد', weight: 3 },
  { word: 'ملک', weight: 4 },
  { word: 'مشارکت', weight: 4 },
  { word: 'پیش‌خرید', weight: 4 },
  { word: 'پیش خرید', weight: 4 },
  { word: 'سرمایه', weight: 3 },
  { word: 'مستغل', weight: 4 },
  { word: 'جهیزیه', weight: 3 },
  { word: 'کلینیک', weight: 2 },
  { word: 'سوله', weight: 3 },
  { word: 'کارگاه', weight: 3 },
];

const VEHICLE_SIGNALS: { word: string; weight: number }[] = [
  { word: 'خودرو', weight: 4 },
  { word: 'ماشین', weight: 4 },
  { word: 'پژو', weight: 4 },
  { word: 'پراید', weight: 4 },
  { word: 'سمند', weight: 3 },
  { word: 'تیبا', weight: 3 },
  { word: 'دنا', weight: 3 },
  { word: 'دوو', weight: 4 },
  { word: 'سیلو', weight: 3 },
  { word: 'موتور', weight: 5 },
  { word: 'موتورسیکلت', weight: 5 },
  { word: 'قایق', weight: 5 },
  { word: 'کارکرد', weight: 3 },
  { word: 'یدکی', weight: 3 },
  { word: 'قطعه', weight: 2 },
];

const PRODUCT_SIGNALS: { word: string; weight: number }[] = [
  { word: 'گوشی', weight: 4 },
  { word: 'آیفون', weight: 4 },
  { word: 'iphone', weight: 4 },
  { word: 'لپ‌تاپ', weight: 4 },
  { word: 'لپ تاپ', weight: 4 },
  { word: 'macbook', weight: 3 },
  { word: 'کنسول', weight: 3 },
  { word: 'ps5', weight: 3 },
  { word: 'playstation', weight: 4 },
  { word: 'پلی استیشن', weight: 5 },
  { word: 'پلی‌استیشن', weight: 5 },
  { word: 'پلیستیشن', weight: 5 },
  { word: 'ps5', weight: 4 },
  { word: 'ps4', weight: 4 },
  { word: 'xbox', weight: 4 },
  { word: 'کنسول', weight: 4 },
  { word: 'دسته پلی', weight: 5 },
  { word: 'دسته بازی', weight: 5 },
  { word: 'کنترلر', weight: 4 },
  { word: 'gamepad', weight: 3 },
  { word: 'سامسونگ', weight: 2 },
  { word: 'شیائومی', weight: 2 },
  { word: 'یخچال', weight: 4 },
  { word: 'مبل', weight: 4 },
  { word: 'بلیط', weight: 4 },
  { word: 'گربه', weight: 4 },
  { word: 'پوشاک', weight: 3 },
  { word: 'کت و شلوار', weight: 4 },
  { word: 'دوربین', weight: 4 },
  { word: 'تبلت', weight: 3 },
  { word: 'پیانو', weight: 6 },
  { word: 'piano', weight: 6 },
  { word: 'گیتار', weight: 5 },
  { word: 'ویولن', weight: 5 },
  { word: 'سنتور', weight: 5 },
  { word: 'کمانچه', weight: 5 },
  { word: 'آلات موسیقی', weight: 6 },
  { word: 'ساز', weight: 3 },
  { word: 'ساعت', weight: 5 },
  { word: 'رولکس', weight: 6 },
  { word: 'rolex', weight: 6 },
  { word: 'دیتونا', weight: 6 },
  { word: 'daytona', weight: 6 },
  { word: 'کارتیر', weight: 5 },
  { word: 'cartier', weight: 5 },
  { word: 'امگا', weight: 4 },
  { word: 'omega', weight: 4 },
];

/** Service signals require concrete service nouns, not generic desire words. */
const SERVICE_SIGNALS: { word: string; weight: number }[] = [
  { word: 'تعمیرکار', weight: 4 },
  { word: 'تعمیر', weight: 3 },
  { word: 'نصب', weight: 3 },
  { word: 'نظافت', weight: 4 },
  { word: 'نظافتچی', weight: 4 },
  { word: 'لوله', weight: 3 },
  { word: 'لوله‌کشی', weight: 4 },
  { word: 'برقکار', weight: 4 },
  { word: 'برق‌کار', weight: 4 },
  { word: 'نقاش', weight: 3 },
  { word: 'اسباب کشی', weight: 4 },
  { word: 'اسباب‌کشی', weight: 4 },
  { word: 'باربری', weight: 3 },
  { word: 'کولر', weight: 3 },
  { word: 'پزشک', weight: 3 },
  { word: 'وکیل', weight: 3 },
  { word: 'طراحی سایت', weight: 3 },
];

const JOB_SIGNALS: { word: string; weight: number }[] = [
  { word: 'استخدام', weight: 5 },
  { word: 'نیاز به نیرو', weight: 5 },
  { word: 'جویای کار', weight: 4 },
  { word: 'کار پیدا', weight: 4 },
  { word: 'رزومه', weight: 3 },
];

const SOCIAL_SIGNALS: { word: string; weight: number }[] = [
  { word: 'گم شده', weight: 4 },
  { word: 'گمشده', weight: 4 },
  { word: 'گم کردم', weight: 4 },
  { word: 'داوطلب', weight: 3 },
  { word: 'رویداد', weight: 2 },
  { word: 'همایش', weight: 4 },
  { word: 'سمینار', weight: 3 },
];

/** Known Tehran neighborhoods for area extraction. */
import { getKnownAreasForCity, KNOWN_AREAS_FROM_CATALOG } from '@/lib/neighborhoods/known-areas';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';

/** @deprecated Prefer getKnownAreasForCity — legacy Tehran-only list kept as fallback. */
const LEGACY_TEHRAN_AREAS = [
  'ولنجک',
  'سعادت‌آباد',
  'سعادت اباد',
  'نیاوران',
  'جردن',
  'پونک',
  'شریعتی',
  'ونک',
  'تجریش',
  'پاسداران',
  'یوسف‌آباد',
  'یوسف اباد',
  'صادقیه',
  'ستارخان',
  'اکباتان',
  'شهرک غرب',
  'فرمانیه',
  'زعفرانیه',
  'قیطریه',
  'نارمک',
  'تهرانپارس',
  'پیروزی',
  'افسریه',
  'شهرری',
  'اندیشه',
] as const;

export const KNOWN_AREAS = [
  ...KNOWN_AREAS_FROM_CATALOG,
  ...LEGACY_TEHRAN_AREAS.filter((a) => !KNOWN_AREAS_FROM_CATALOG.includes(a)),
];

function normalizeForClassifier(text: string): string {
  return normalizeIntakeText(text);
}

function scoreSignals(
  text: string,
  signals: { word: string; weight: number }[]
): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];
  for (const { word, weight } of signals) {
    if (text.includes(word)) {
      score += weight;
      matched.push(word);
    }
  }
  return { score, matched };
}

export function classifyVertical(rawText: string): VerticalClassification {
  const text = normalizeForClassifier(rawText);
  const scores: Record<ClassifierVertical, number> = {
    'real-estate': 0,
    vehicles: 0,
    products: 0,
    services: 0,
    jobs: 0,
    social: 0,
  };
  const signals: string[] = [];

  const re = scoreSignals(text, REAL_ESTATE_SIGNALS);
  scores['real-estate'] = re.score;
  signals.push(...re.matched.map((w) => `re:${w}`));

  const veh = scoreSignals(text, VEHICLE_SIGNALS);
  scores.vehicles = veh.score;
  signals.push(...veh.matched.map((w) => `veh:${w}`));

  const prod = scoreSignals(text, PRODUCT_SIGNALS);
  scores.products = prod.score;
  signals.push(...prod.matched.map((w) => `prod:${w}`));

  const svc = scoreSignals(text, SERVICE_SIGNALS);
  scores.services = svc.score;
  signals.push(...svc.matched.map((w) => `svc:${w}`));

  const job = scoreSignals(text, JOB_SIGNALS);
  scores.jobs = job.score;
  signals.push(...job.matched.map((w) => `job:${w}`));

  const soc = scoreSignals(text, SOCIAL_SIGNALS);
  scores.social = soc.score;
  signals.push(...soc.matched.map((w) => `soc:${w}`));

  if (text.includes('نقاش')) {
    scores.services += 8;
    scores['real-estate'] = Math.max(0, scores['real-estate'] - 5);
  }
  if (text.includes('وکیل') || text.includes('لوله')) {
    scores.services += 5;
    scores['real-estate'] = Math.max(0, scores['real-estate'] - 3);
  }
  if (text.includes('تعمیر') || text.includes('تعمیرکار')) {
    scores.services += 4;
    scores.products = Math.max(0, scores.products - 2);
  }
  if (isVehicleRepairServiceIntent(text)) {
    scores.services += 12;
    scores.vehicles = 0;
    scores.products = Math.max(0, scores.products - 6);
  }
  if (text.includes('استخدام') || text.includes('نیاز به نیرو')) {
    scores.jobs += 4;
  }

  // "میخوام/میخواهم" boosts buy intent only when a vertical already has signal
  const hasDesire =
    text.includes('میخوام') ||
    text.includes('میخواهم') ||
    text.includes('میخرم') ||
    text.includes('دنبال');
  if (hasDesire && scores['real-estate'] > 0) scores['real-estate'] += 1;
  if (hasDesire && scores.vehicles > 0) scores.vehicles += 1;
  if (hasDesire && scores.products > 0) scores.products += 1;

  const sorted = [...VERTICALS].sort((a, b) => scores[b] - scores[a]);
  const top = sorted[0];
  const second = sorted[1];
  const topScore = scores[top];
  const secondScore = scores[second] ?? 0;
  const maxPossible = 12;
  const certainty =
    topScore <= 0
      ? 0
      : Math.min(1, (topScore - secondScore) / Math.max(topScore, 1) + topScore / maxPossible / 2);

  const fallbackVertical: ClassifierVertical =
    hasBuyIntentPhrase(text) && scores.products >= scores.services ? 'products' : 'services';

  return {
    vertical: topScore > 0 ? top : fallbackVertical,
    score: topScore,
    certainty: topScore > 0 ? certainty : 0,
    signals,
    scores,
  };
}

/** Map classifier vertical → default category slug. */
export function categorySlugForVertical(
  vertical: ClassifierVertical,
  text: string
): string {
  const t = normalizeForClassifier(text);
  switch (vertical) {
    case 'real-estate': {
      const shortTerm =
        t.includes('روزانه') ||
        t.includes('کوتاه') ||
        t.includes('شب') ||
        t.includes('سوئیت روزانه');
      if (shortTerm) {
        if (t.includes('ویلا') || t.includes('باغ')) return 'villa-short-rent';
        if (t.includes('دفتر') || t.includes('آموزشی')) return 'workspace-short-rent';
        return 'suite-apartment-rent';
      }
      if (t.includes('زمین') || t.includes('کلنگی')) {
        if (t.includes('اجاره') || t.includes('رهن') || t.includes('ودیعه')) return 'land-rent';
        return 'land-sale';
      }
      if (t.includes('مغازه')) {
        return t.includes('اجاره') || t.includes('رهن') ? 'shop-rent' : 'shop-sale';
      }
      if (t.includes('دفتر')) {
        return t.includes('اجاره') || t.includes('رهن') ? 'office-rent' : 'office-sale';
      }
      if (t.includes('سوله') || t.includes('صنعتی')) {
        return t.includes('اجاره') || t.includes('رهن') ? 'industrial-rent' : 'industrial-sale';
      }
      if (t.includes('ویلا') || (t.includes('خانه') && !t.includes('خونه میخوام'))) {
        return t.includes('اجاره') || t.includes('رهن') ? 'villa-rent' : 'villa-sale';
      }
      if (t.includes('اجاره') || t.includes('رهن') || t.includes('ودیعه')) {
        return 'apartment-rent';
      }
      if (t.includes('فروش') || t.includes('میفروش')) return 'apartment-sale';
      // Keep neutral when deal type is not explicit; dealType will be asked in intake.
      return 'real-estate';
    }
    case 'vehicles':
      if (t.includes('موتور') || t.includes('موتورسیکلت')) return 'motorcycle';
      if (t.includes('قایق')) return 'boat';
      if (t.includes('یدکی') || t.includes('قطعه')) return 'spare-parts';
      return 'car';
    case 'products':
      if (hasPetProductPhrase(text)) return 'pets';
      if (
        t.includes('ساعت') ||
        t.includes('رولکس') ||
        t.includes('rolex') ||
        t.includes('دیتونا') ||
        t.includes('daytona') ||
        t.includes('کارتیر') ||
        t.includes('cartier')
      ) {
        return 'jewelry-watches';
      }
      if (
        t.includes('پلی استیشن') ||
        t.includes('پلیستیشن') ||
        t.includes('playstation') ||
        t.includes('ps5') ||
        t.includes('ps4') ||
        t.includes('xbox') ||
        t.includes('کنسول') ||
        t.includes('دسته پلی') ||
        t.includes('دسته بازی') ||
        t.includes('کنترلر')
      ) {
        return 'game-console';
      }
      if (t.includes('لپ')) return 'laptop';
      if (t.includes('گوشی') || t.includes('آیفون') || t.includes('iphone')) {
        return 'mobile-phone';
      }
      if (
        t.includes('پیانو') ||
        t.includes('piano') ||
        t.includes('گیتار') ||
        t.includes('ویولن') ||
        t.includes('سنتور') ||
        t.includes('کمانچه') ||
        t.includes('آلات موسیقی')
      ) {
        return 'musical-instruments';
      }
      return 'electronics';
    case 'jobs':
      return 'it';
    case 'social':
      if (t.includes('گم')) return 'lost-found';
      return 'social';
    case 'services':
    default: {
      const repairSlug = detectRepairServiceCategory(text);
      if (repairSlug) return repairSlug;
      if (t.includes('تعمیر') || t.includes('کولر')) return 'repairs';
      if (t.includes('نظافت')) return 'cleaning';
      if (t.includes('لوله')) return 'plumbing';
      if (t.includes('اسباب')) return 'moving';
      if (t.includes('برق')) return 'electrical';
      if (t.includes('نقاش')) return 'painting';
      return 'services';
    }
  }
}

/** Avoid false positives like «ری» inside «متری». */
function textContainsAreaName(text: string, area: string): boolean {
  const normalized = area.replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  const idx = text.indexOf(normalized);
  if (idx === -1) return false;
  const isAdjacentLetter = (c: string | undefined) =>
    c != null && /[\u0600-\u06FFa-zA-Z0-9]/.test(c);
  const before = idx > 0 ? text[idx - 1] : undefined;
  const after =
    idx + normalized.length < text.length ? text[idx + normalized.length] : undefined;
  return !isAdjacentLetter(before) && !isAdjacentLetter(after);
}

export function parseAreaFromText(rawText: string, cityId?: string | null): string | undefined {
  const text = rawText.trim();
  if (!text) return undefined;

  const rejectArea = new Set(['به', 'در', 'از', 'تا', 'حرم', 'مترو', 'بیمارستان']);
  const drNonLocation = new Set(['حد', 'نو', 'اینجا', 'آنجا', 'کل', 'هر', 'بین', 'صورت']);

  const scopedPatterns = [
    /محدوده\s*[:：]?\s*([^،\n]+)/u,
    /منطقه\s*[:：]?\s*([^،\n]+)/u,
    /محله\s*[:：]?\s*([^،\n]+)/u,
  ];
  for (const re of scopedPatterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const area = stripTrailingCityFromArea(m[1].trim());
      if (area.length >= 2 && area.length <= 60) return area;
    }
  }

  const knownAreas = getKnownAreasForCity(cityId);
  const sorted = [...knownAreas].sort((a, b) => b.length - a.length);
  for (const area of sorted) {
    if (area.length < 5) continue;
    if (textContainsAreaName(text, area)) return area.replace(/\s+/g, ' ').trim();
  }

  for (const area of KNOWN_AREAS) {
    if (area.length < 5) continue;
    if (textContainsAreaName(text, area)) return area.replace(/\s+/g, ' ').trim();
  }

  const fromFragment = extractLocationFragment(text);
  if (fromFragment) {
    const area = stripTrailingCityFromArea(fromFragment);
    const lead = area.split(/\s+/)[0] ?? area;
    if (
      area.length >= 2 &&
      area.length <= 60 &&
      !rejectArea.has(lead) &&
      !drNonLocation.has(lead)
    ) {
      return area;
    }
  }

  const patterns = [
    /محدوده\s+([^\s،,.]+(?:\s+[^\s،,.]+){0,4})/u,
    /منطقه\s+([^\s،,.]+(?:\s+[^\s،,.]+){0,4})/u,
    /محله\s+([^\s،,.]+(?:\s+[^\s،,.]+){0,4})/u,
    /حاشیه\s+([^\s،,.]+(?:\s+[^\s،,.]+){0,4})/u,
    /نزدیک\s+(?:به\s+)?([^\s،,.]+)/u,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const area = stripTrailingCityFromArea(m[1].trim());
      if (rejectArea.has(area)) continue;
      if (area.length >= 2 && area.length <= 60) return area;
    }
  }

  const fromDr = text.match(/در\s+([^\s،,.]+)/u);
  if (fromDr?.[1]) {
    const candidate = stripTrailingCityFromArea(fromDr[1].trim());
    if (
      candidate.length >= 2 &&
      candidate.length <= 60 &&
      !rejectArea.has(candidate) &&
      !drNonLocation.has(candidate)
    ) {
      return candidate;
    }
  }

  return undefined;
}

/** Bridge classifier vertical to ParseVertical used in prompts. */
export function classifierToParseVertical(v: ClassifierVertical): ParseVertical {
  if (v === 'products') return 'electronics';
  return v;
}

export function isVerticalConfident(classification: VerticalClassification): boolean {
  return classification.score >= 3 && classification.certainty >= 0.35;
}
