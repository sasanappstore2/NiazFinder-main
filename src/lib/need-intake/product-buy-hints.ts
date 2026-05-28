import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';

/** Gaming / console product phrases (Persian + Latin). */
const GAMING_PRODUCT_PHRASES = [
  'پلی استیشن',
  'پلی‌استیشن',
  'پلیستیشن',
  'playstation',
  'play station',
  'ps5',
  'ps4',
  'ps3',
  'xbox',
  'nintendo',
  'نینتندو',
  'سوییچ',
  'nintendo switch',
  'کنسول',
  'gamepad',
  'دسته پلی',
  'دسته ps',
  'دسته بازی',
  'کنترلر',
  'joystick',
];

/** Watches / luxury goods — not services. */
const WATCH_LUXURY_PHRASES = [
  'ساعت',
  'رولکس',
  'rolex',
  'دیتونا',
  'daytona',
  'امگا',
  'omega',
  'کارتیر',
  'cartier',
  'پatek',
  'پتک',
  'آودمار',
  'هابلوت',
  'سابمارینر',
  'submariner',
  'لوکس',
];

const BUY_HINTS = ['میخرم', 'می‌خرم', 'میخوام', 'میخواهم', 'خرید', 'دنبال', 'نیاز دارم'];

export function hasGamingProductPhrase(text: string): boolean {
  const t = normalizeIntakeText(text);
  return GAMING_PRODUCT_PHRASES.some((p) => t.includes(normalizeIntakeText(p)));
}

export function hasWatchOrLuxuryProductPhrase(text: string): boolean {
  const t = normalizeIntakeText(text);
  return WATCH_LUXURY_PHRASES.some((p) => t.includes(normalizeIntakeText(p)));
}

export function hasBuyIntentPhrase(text: string): boolean {
  const t = normalizeIntakeText(text);
  return BUY_HINTS.some((w) => t.includes(w));
}

/** Concrete product noun in text (watch, phone, console, …) — not generic «میخوام» only. */
export function hasConcreteProductNoun(text: string): boolean {
  return hasGamingProductPhrase(text) || hasWatchOrLuxuryProductPhrase(text);
}

/** User wants to buy a product (not hire a service). */
export function isLikelyProductPurchase(text: string): boolean {
  return hasBuyIntentPhrase(text) && hasConcreteProductNoun(text);
}

/** Short product label for listing titles (e.g. «رولکس دیتونا»). */
export function extractProductSubjectFromText(rawText: string): string | null {
  const t = normalizeIntakeText(rawText);
  if (/رولکس|rolex/u.test(t)) {
    if (t.includes('دیتونا') || t.includes('daytona')) return 'رولکس دیتونا';
    const model = t.match(/(?:رولکس|rolex)\s+([a-z0-9\u0600-\u06FF-]+)/iu)?.[1];
    return model ? `رولکس ${model}` : 'رولکس';
  }
  if (t.includes('دیتونا') || t.includes('daytona')) return 'رولکس دیتونا';
  if (t.includes('ساعت')) {
    const tail = t
      .replace(/^.*?\bساعت\b\s*/u, '')
      .replace(/\s*(میخوام|میخواهم|میخرم|می‌خرم|خرید|دنبال).*$/u, '')
      .trim();
    if (tail.length >= 2 && tail.length <= 48) return `ساعت ${tail}`;
    return 'ساعت';
  }
  return null;
}
