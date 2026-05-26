/** Persian (۰–۹) and Arabic-Indic (٠–٩) → ASCII digits */
const PERSIAN_DIGIT = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGIT = '٠١٢٣٤٥٦٧٨٩';

export function toPersianDigits(value: string | number): string {
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value).replace(/\d/g, (d) => persian[Number(d)]);
}

/** Normalize any digit script to ASCII 0-9 (keeps only digits). */
export function extractMoneyDigits(input: string): string {
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

/** Parse user input → integer Toman (stored as plain number, e.g. 5000000). */
export function parseMoneyInput(input: string): number | null {
  const raw = extractMoneyDigits(input);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Display for inputs: Persian digits + thousands separators (fa-IR). */
export function formatMoneyInputDisplay(digitString: string): string {
  if (!digitString) return '';
  const n = Number(digitString);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('fa-IR');
}

/** Display for summaries (number already in DB). */
export function formatMoneyToman(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString('fa-IR');
}
