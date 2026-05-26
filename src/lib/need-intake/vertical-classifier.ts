import type { ParseVertical } from '@/lib/need-intake/parse-vertical';

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
  { word: 'محدوده', weight: 2 },
  { word: 'محله', weight: 2 },
  { word: 'منطقه', weight: 2 },
  { word: 'آژانس املاک', weight: 4 },
  { word: 'مشاور املاک', weight: 4 },
  { word: 'پیش فروش', weight: 3 },
  { word: 'پیش‌فروش', weight: 3 },
  { word: 'سوئیت', weight: 3 },
  { word: 'دفتر', weight: 2 },
  { word: 'مغازه', weight: 2 },
];

const VEHICLE_SIGNALS: { word: string; weight: number }[] = [
  { word: 'خودرو', weight: 4 },
  { word: 'ماشین', weight: 4 },
  { word: 'پژو', weight: 4 },
  { word: 'پراید', weight: 4 },
  { word: 'سمند', weight: 3 },
  { word: 'تیبا', weight: 3 },
  { word: 'دنا', weight: 3 },
  { word: 'موتور', weight: 3 },
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
  { word: 'playstation', weight: 3 },
  { word: 'سامسونگ', weight: 2 },
  { word: 'شیائومی', weight: 2 },
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
];

/** Known Tehran neighborhoods for area extraction. */
export const KNOWN_AREAS = [
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
];

function normalizeForClassifier(text: string): string {
  return text
    .trim()
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
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

  return {
    vertical: topScore > 0 ? top : 'services',
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
    case 'real-estate':
      if (t.includes('اجاره') || t.includes('رهن') || t.includes('ودیعه')) {
        return 'apartment-rent';
      }
      if (t.includes('فروش') || t.includes('میفروش')) return 'apartment-sale';
      return 'apartment-sale';
    case 'vehicles':
      return 'car';
    case 'products':
      if (t.includes('لپ')) return 'laptop';
      if (t.includes('گوشی') || t.includes('آیفون') || t.includes('iphone')) {
        return 'mobile-phone';
      }
      return 'electronics';
    case 'jobs':
      return 'it';
    case 'social':
      if (t.includes('گم')) return 'lost-found';
      return 'social';
    case 'services':
    default:
      if (t.includes('تعمیر') || t.includes('کولر')) return 'repairs';
      if (t.includes('نظافت')) return 'cleaning';
      if (t.includes('لوله')) return 'plumbing';
      if (t.includes('اسباب')) return 'moving';
      if (t.includes('برق')) return 'electrical';
      if (t.includes('نقاش')) return 'painting';
      return 'services';
  }
}

export function parseAreaFromText(rawText: string): string | undefined {
  const text = rawText.trim();
  for (const area of KNOWN_AREAS) {
    if (text.includes(area)) return area.replace(/\s+/g, ' ').trim();
  }
  const patterns = [
    /محدوده\s+([^\s،,.]+(?:\s+[^\s،,.]+)?)/,
    /منطقه\s+([^\s،,.]+(?:\s+[^\s،,.]+)?)/,
    /محله\s+([^\s،,.]+(?:\s+[^\s،,.]+)?)/,
    /نزدیک\s+([^\s،,.]+)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const area = m[1].trim();
      if (area.length >= 2 && area.length <= 40) return area;
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
