/** Persian (۰–۹) and Arabic-Indic (٠–٩) digit scripts */
const PERSIAN_DIGIT = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGIT = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

const IRAN_MOBILE_REGEX = /^09[0-9]{9}$/;

/** ASCII 0-9 → Persian ۰-۹ for display */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/**
 * Extract digits from any script → ASCII 0-9 only (ignores separators, letters, etc.).
 * Alias of legacy `extractMoneyDigits`.
 */
export function toAsciiDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
      continue;
    }
    const p = PERSIAN_DIGIT.indexOf(ch);
    if (p >= 0) {
      out += String(p);
      continue;
    }
    const a = ARABIC_DIGIT.indexOf(ch);
    if (a >= 0) out += String(a);
  }
  return out;
}

/** @deprecated Use `toAsciiDigits` — kept for money.ts compatibility */
export const extractMoneyDigits = toAsciiDigits;

/** fa-IR grouping for integer digit strings (no currency). */
export function formatPersianInteger(digitString: string): string {
  if (!digitString) return '';
  const n = Number(digitString);
  if (!Number.isFinite(n)) return '';
  return formatCountFa(n);
}

/** SSR-safe Persian integer with thousands separator (no ICU locale drift). */
export function formatCountFa(value: number): string {
  if (!Number.isFinite(value)) return '';
  const negative = value < 0;
  const abs = Math.abs(Math.trunc(value));
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const persian = toPersianDigits(grouped);
  return negative ? `-${persian}` : persian;
}

/**
 * Normalize Iranian mobile to `09xxxxxxxxx` or null.
 * Accepts Persian/Arabic digits, optional +98 / 98 / leading 9.
 */
export function normalizeIranMobile(input: string): string | null {
  let digits = toAsciiDigits(input);
  if (!digits) return null;

  if (digits.startsWith('98') && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.startsWith('0098')) {
    digits = `0${digits.slice(4)}`;
  } else if (digits.length === 10 && digits.startsWith('9')) {
    digits = `0${digits}`;
  }

  if (!IRAN_MOBILE_REGEX.test(digits)) return null;
  return digits;
}

/** Format 11-digit mobile for display (Persian digits, spaced). */
export function formatIranMobileDisplay(asciiPhone: string): string {
  const d = toAsciiDigits(asciiPhone);
  if (d.length !== 11) return toPersianDigits(d);
  const spaced = `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  return toPersianDigits(spaced);
}
