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
  'نintendo',
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

const BUY_HINTS = ['میخرم', 'می‌خرم', 'میخوام', 'میخواهم', 'خرید', 'دنبال', 'نیاز دارم'];

export function hasGamingProductPhrase(text: string): boolean {
  const t = normalizeIntakeText(text);
  return GAMING_PRODUCT_PHRASES.some((p) => t.includes(normalizeIntakeText(p)));
}

export function hasBuyIntentPhrase(text: string): boolean {
  const t = normalizeIntakeText(text);
  return BUY_HINTS.some((w) => t.includes(w));
}

/** User wants to buy a product (not hire a service). */
export function isLikelyProductPurchase(text: string): boolean {
  return hasBuyIntentPhrase(text) && hasGamingProductPhrase(text);
}
