import {
  extractMoneyDigits,
  formatPersianInteger,
  toAsciiDigits,
  toPersianDigits,
} from '@/lib/format/digits';

export { extractMoneyDigits, toAsciiDigits, toPersianDigits };

/** Parse user input → integer Toman (stored as plain number, e.g. 5000000). */
export function parseMoneyInput(input: string): number | null {
  const raw = toAsciiDigits(input);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Display for inputs: Persian digits + thousands separators (fa-IR). */
export function formatMoneyInputDisplay(digitString: string): string {
  return formatPersianInteger(digitString);
}

/** Display for summaries (number already in DB). */
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
