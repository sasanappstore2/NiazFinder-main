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
