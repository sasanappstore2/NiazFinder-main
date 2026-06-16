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

const MUSICAL_PRODUCT_PHRASES = [
  'پیانو',
  'piano',
  'گیتار',
  'ویولن',
  'ویولون',
  'violin',
  'violon',
  'سنتور',
  'کمانچه',
  'آلات موسیقی',
  'ساز موسیقی',
  'درام',
  'drum',
  'ساکسیفون',
];

export function hasMusicalProductPhrase(text: string): boolean {
  const t = normalizeIntakeText(text);
  return MUSICAL_PRODUCT_PHRASES.some((p) => t.includes(normalizeIntakeText(p)));
}

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
  return (
    hasGamingProductPhrase(text) ||
    hasWatchOrLuxuryProductPhrase(text) ||
    hasMusicalProductPhrase(text)
  );
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
  if (/پیانو|piano/u.test(t)) {
    const brand = t.match(/(?:یاماها|yamaha|kawai|کawai|رولند|roland|korg|korgs)/iu)?.[0];
    const condition =
      /\bنو\b/u.test(t) && !/دست\s*دوم/u.test(t)
        ? 'نو'
        : /دست\s*دوم/u.test(t)
          ? 'دست دوم'
          : '';
    const parts = ['پیانو'];
    if (brand) {
      parts.push(/yamaha/i.test(brand) ? 'یاماها' : brand);
    }
    if (condition) parts.push(condition);
    return parts.join(' ');
  }
  if (/گیتار/u.test(t)) {
    const brand = t.match(/(?:فندر|fender|گیبسون|gibson|یاماها|yamaha)/iu)?.[0];
    return brand ? `گیتار ${brand}` : 'گیتار';
  }
  if (/ویولن|ویولون|violin|violon/u.test(t)) return 'ویولن';
  return null;
}
