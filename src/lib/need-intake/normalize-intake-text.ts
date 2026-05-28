/**
 * Light normalization for intake keyword rules (keeps آ/ی/ک; only ZWNJ + spaces).
 * Full {@link normalizeText} from persian-normalize is for search/fuzzy, not category keywords.
 */
export function normalizeIntakeText(text: string): string {
  return text
    .trim()
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
