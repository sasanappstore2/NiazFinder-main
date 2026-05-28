const ARABIC_TO_PERSIAN: Record<string, string> = {
  ي: 'ی',
  ك: 'ک',
  ة: 'ه',
  ى: 'ی',
 ؤ: 'و',
  إ: 'ا',
  أ: 'ا',
  آ: 'آ',
};

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * Normalize Persian user input for deterministic matching.
 * - Arabic → Persian letters
 * - Persian/Arabic digits → ASCII
 * - Collapse whitespace, strip punctuation
 * - Lowercase Latin segments
 */
export function normalizePersian(text: string): string {
  let out = text.trim();

  for (const [ar, fa] of Object.entries(ARABIC_TO_PERSIAN)) {
    out = out.split(ar).join(fa);
  }

  out = out.replace(/\u200c/g, ' ');

  for (let i = 0; i < PERSIAN_DIGITS.length; i += 1) {
    out = out.split(PERSIAN_DIGITS[i]!).join(String(i));
  }
  for (let i = 0; i < ARABIC_DIGITS.length; i += 1) {
    out = out.split(ARABIC_DIGITS[i]!).join(String(i));
  }

  out = out
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return out;
}

/** Normalize a single token/phrase for dictionary lookup keys. */
export function normalizeLookupKey(text: string): string {
  return normalizePersian(text).replace(/\s+/g, ' ').trim();
}
