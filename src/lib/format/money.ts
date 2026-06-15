import {
  extractMoneyDigits,
  formatPersianInteger,
  toAsciiDigits,
  toPersianDigits,
} from '@/lib/format/digits';

export { extractMoneyDigits, toAsciiDigits, toPersianDigits };

/** Parse user input → integer Toman (stored as plain number, e.g. 5000000). */
export function parseMoneyInput(input: string): number | null {
  const trimmed = input.trim();
  if (/\d\s*(?:m\b|meter\b|متر|متری)/i.test(trimmed)) return null;

  const millionMatch = trimmed.match(
    /([\d۰-۹٠-٩]+(?:[٬,][\d۰-۹٠-٩]+)*(?:\.\d+)?)\s*میلیون/u
  );
  if (millionMatch?.[1]) {
    const n = Number(toAsciiDigits(millionMatch[1].replace(/[٬,]/g, '')));
    if (Number.isFinite(n) && n > 0) return Math.round(n * 1_000_000);
  }

  const billionMatch = trimmed.match(
    /([\d۰-۹٠-٩]+(?:[٬,][\d۰-۹٠-٩]+)*(?:\.\d+)?)\s*میلیارد/u
  );
  if (billionMatch?.[1]) {
    const n = Number(toAsciiDigits(billionMatch[1].replace(/[٬,]/g, '')));
    if (Number.isFinite(n) && n > 0) return Math.round(n * 1_000_000_000);
  }

  const raw = toAsciiDigits(trimmed);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Display for inputs: Persian digits + thousands separators (fa-IR). */
export function formatMoneyInputDisplay(digitString: string): string {
  return formatPersianInteger(digitString);
}

const TOMAN_MILLION = 1_000_000;
const TOMAN_BILLION = 1_000_000_000;
/** 1 hemmat = 1,000 billion Toman (هزار میلیارد تومان). */
const TOMAN_HEMMAT = 1_000_000_000_000;

function formatScaledTomanUnit(value: number, divisor: number): string {
  const n = value / divisor;
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n - Math.round(n)) < 1e-9) {
    return Math.round(n).toLocaleString('fa-IR');
  }
  return n.toLocaleString('fa-IR', { maximumFractionDigits: 2 });
}

/**
 * Compact Persian Toman label: million / billion / hemmat for large amounts.
 * Stored values are plain integer Toman (e.g. 8_000_000_000).
 */
export function formatTomanAmount(
  value: number,
  options?: { includeSuffix?: boolean }
): string {
  if (!Number.isFinite(value)) return '';
  const includeSuffix = options?.includeSuffix !== false;
  const suffix = includeSuffix ? ' \u062A\u0648\u0645\u0627\u0646' : '';
  const abs = Math.abs(value);

  if (abs >= TOMAN_HEMMAT) {
    return `${formatScaledTomanUnit(value, TOMAN_HEMMAT)} \u0647\u0645\u062A${suffix}`;
  }
  if (abs >= TOMAN_BILLION) {
    return `${formatScaledTomanUnit(value, TOMAN_BILLION)} \u0645\u06CC\u0644\u06CC\u0627\u0631\u062F${suffix}`;
  }
  if (abs >= TOMAN_MILLION) {
    return `${formatScaledTomanUnit(value, TOMAN_MILLION)} \u0645\u06CC\u0644\u06CC\u0648\u0646${suffix}`;
  }
  return `${value.toLocaleString('fa-IR')}${suffix}`;
}

/** Display for summaries (number already in DB) — raw grouping, no unit scaling. */
export function formatMoneyToman(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString('fa-IR');
}

/** Digit runs in free-text prices, including existing ٬/, grouping. */
const PRICE_NUMBER_RE = /[\d۰-۹٠-٩]+(?:[٬,][\d۰-۹٠-٩]+)*/g;

/**
 * Format digit runs inside free-text price strings (e.g. priceRange, variant price).
 * Runs of 4+ digits get fa-IR grouping; shorter runs become Persian digits only.
 */
export function formatPriceText(value: string | null | undefined): string {
  if (value == null || value === '') return value ?? '';

  return value.replace(PRICE_NUMBER_RE, (match) => {
    const ascii = toAsciiDigits(match);
    if (!ascii) return match;
    if (ascii.length >= 4) {
      const n = Number(ascii);
      if (!Number.isFinite(n)) return match;
      return n.toLocaleString('fa-IR');
    }
    return toPersianDigits(ascii);
  });
}
