import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import { joinListingTitleParts, LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';

export type NeedCopyInput = {
  userText: string;
  province: string;
  city: string;
  neighborhood?: string;
  categorySlug: string;
  subcategorySlug?: string;
  categoryNameFa: string;
  categoryPathFa?: string;
};

const QUESTION_PREFIX =
  /^(چطور(?:ی)?|چگونه|کجا|کی|آیا|میشه|می‌شه|میتونم|می‌تونم|لطفاً|لطفا)\s+/u;

const SERVICE_VERBS =
  /(نشتی|خراب|کار نمی|نمی‌کنه|نمیکنه|سرویس|تعمیر|نصب|انجام|شارژ|تعویض|ساخت|بازسازی)/u;

const BUY_HINTS = /(خرید|می‌خوام|میخوام|نیاز دارم|دنبال|پیدا کن|معرفی کن)/u;
const RENT_HINTS = /(اجاره|رهن)/u;
const SELL_HINTS = /(فروش|می‌فروشم|میفروشم)/u;

function truncate(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (t.length <= LISTING_TITLE_MAX_LENGTH) return t;
  return `${t.slice(0, LISTING_TITLE_MAX_LENGTH - 1).trim()}…`;
}

function locationLabel(item: NeedCopyInput): string {
  const parts = [item.neighborhood, item.city].filter(Boolean);
  return parts.join('، ');
}

function inferDealPrefix(item: NeedCopyInput): string | null {
  const text = item.userText;
  const root = getRootCategorySlug(item.subcategorySlug ?? item.categorySlug);
  if (root === 'real-estate') {
    if (RENT_HINTS.test(text)) return 'اجاره';
    if (SELL_HINTS.test(text)) return 'فروش';
    if (BUY_HINTS.test(text) || /خانه|آپارتمان|ملک|زمین|ویلا/u.test(text)) return 'خرید';
    return 'جستجوی ملک';
  }
  if (root === 'vehicles') {
    if (SELL_HINTS.test(text)) return 'فروش';
    if (RENT_HINTS.test(text)) return 'اجاره';
    return 'خرید';
  }
  if (root === 'jobs') return 'استخدام';
  return null;
}

function inferSubject(item: NeedCopyInput): string {
  const root = getRootCategorySlug(item.subcategorySlug ?? item.categorySlug);
  const text = item.userText.replace(QUESTION_PREFIX, '').trim();

  if (root === 'real-estate') {
    if (/آپارتمان/u.test(text)) return 'آپارتمان';
    if (/ویلا/u.test(text)) return 'ویلا';
    if (/زمین/u.test(text)) return 'زمین';
    if (/مغازه|دفتر|تجاری/u.test(text)) return 'ملک تجاری';
    if (/خانه/u.test(text)) return 'خانه';
    return 'ملک';
  }

  if (root === 'vehicles') {
    if (/موتور/u.test(text)) return 'موتورسیکلت';
    return 'خودرو';
  }

  return item.categoryNameFa;
}

export function buildMarketplaceNeedTitle(item: NeedCopyInput): string {
  const loc = locationLabel(item);
  const root = getRootCategorySlug(item.subcategorySlug ?? item.categorySlug);
  const deal = inferDealPrefix(item);
  const subject = inferSubject(item);

  if (root === 'real-estate' || root === 'vehicles') {
    const parts = [`${deal ?? 'خرید'} ${subject}`.trim()];
    if (loc) parts.push(loc);
    return truncate(joinListingTitleParts(parts));
  }

  if (root === 'services' || SERVICE_VERBS.test(item.userText)) {
    const parts = [`درخواست ${item.categoryNameFa}`];
    if (loc) parts.push(loc);
    return truncate(joinListingTitleParts(parts));
  }

  if (root === 'jobs') {
    const parts = ['استخدام', item.categoryNameFa];
    if (loc) parts.push(loc);
    return truncate(joinListingTitleParts(parts));
  }

  const parts = [item.categoryNameFa];
  if (loc) parts.push(loc);
  return truncate(joinListingTitleParts(parts));
}

function rephraseUserNeed(text: string, item: NeedCopyInput): string {
  let t = text.replace(QUESTION_PREFIX, '').replace(/[.؟!]+$/u, '').trim();
  const loc = locationLabel(item);

  if (/چطور|چگونه/u.test(text) && BUY_HINTS.test(text)) {
    return `به دنبال ${inferDealPrefix(item) ?? 'خرید'} ${inferSubject(item)}${loc ? ` در ${loc}` : ''} هستم و به متخصص یا مشاور معتبر نیاز دارم.`;
  }

  if (SERVICE_VERBS.test(t)) {
    if (!/نیاز|می‌خوام|میخوام|لازم/u.test(t)) {
      return `برای ${t}${loc ? ` در ${loc}` : ''} به متخصص ${item.categoryNameFa} نیاز دارم.`;
    }
  }

  if (!/نیاز|می‌خوام|میخوام|دنبال|لازم/u.test(t)) {
    return `نیاز دارم: ${t}${loc ? ` (${loc})` : ''}.`;
  }

  return t.endsWith('.') || t.endsWith('۔') ? t : `${t}.`;
}

export function buildMarketplaceNeedDescription(item: NeedCopyInput): string {
  const locLine = item.neighborhood
    ? `${item.province}، ${item.city}، محله ${item.neighborhood}`
    : `${item.province}، ${item.city}`;

  return [
    rephraseUserNeed(item.userText, item),
    '',
    `محدوده: ${locLine}`,
    item.categoryPathFa ? `دسته: ${item.categoryPathFa}` : `دسته: ${item.categoryNameFa}`,
    '',
    'ترجیح می‌دهم پیشنهادها شامل زمان تقریبی انجام کار، محدوده قیمت و نمونه کارهای مشابه باشد.',
  ].join('\n');
}

export function budgetForCategory(
  categorySlug: string,
  subcategorySlug: string | undefined,
  index: number
): { min: bigint; max: bigint; type: 'FIXED' | 'NEGOTIABLE' } {
  const root = getRootCategorySlug(subcategorySlug ?? categorySlug);
  const bump = index % 5;

  if (root === 'real-estate') {
    const billions = 5 + bump * 3;
    return {
      min: BigInt(billions) * 1_000_000_000n,
      max: BigInt(billions + 8 + (index % 4)) * 1_000_000_000n,
      type: 'NEGOTIABLE',
    };
  }
  if (root === 'vehicles') {
    const base = 300_000_000 + bump * 80_000_000;
    return { min: BigInt(base), max: BigInt(base + 250_000_000), type: 'NEGOTIABLE' };
  }
  if (root === 'jobs') {
    return {
      min: BigInt(12_000_000 + bump * 2_000_000),
      max: BigInt(25_000_000 + bump * 5_000_000),
      type: 'NEGOTIABLE',
    };
  }
  return {
    min: BigInt(800_000 + bump * 200_000),
    max: BigInt(3_500_000 + bump * 500_000),
    type: index % 3 === 0 ? 'NEGOTIABLE' : 'FIXED',
  };
}

export function deliveryForCategory(
  categorySlug: string,
  subcategorySlug: string | undefined,
  index: number
): number | null {
  const root = getRootCategorySlug(subcategorySlug ?? categorySlug);
  if (root === 'real-estate') return null;
  if (root === 'jobs') return 14 + (index % 21);
  if (root === 'services') return 1 + (index % 5);
  return 3 + (index % 10);
}

const CLIENT_NAMES: Array<{ first: string; last: string }> = [
  { first: 'علی', last: 'احمدی' },
  { first: 'مریم', last: 'کریمی' },
  { first: 'رضا', last: 'موسوی' },
  { first: 'سارا', last: 'حسینی' },
  { first: 'امیر', last: 'رضایی' },
  { first: 'فاطمه', last: 'جعفری' },
  { first: 'حسین', last: 'نوری' },
  { first: 'زهرا', last: 'صادقی' },
  { first: 'محمد', last: 'مرادی' },
  { first: 'نگین', last: 'عباسی' },
];

export function clientIdentity(index: number): {
  firstName: string;
  lastName: string;
  displayName: string;
} {
  const row = CLIENT_NAMES[index % CLIENT_NAMES.length]!;
  return { firstName: row.first, lastName: row.last, displayName: `${row.first} ${row.last}` };
}
