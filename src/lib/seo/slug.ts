/**
 * URL-safe SEO slug builder for Persian + Latin titles.
 *
 * Strategy (Divar-style `/v/{title-slug}/{shortId}`):
 *   - Lowercase the title.
 *   - Strip diacritics (Latin) and Arabic-Persian decorations (tatweel, harakat).
 *   - Normalise Persian/Arabic alphabet variants (يىي → ی, كک → ک, ة → ه, etc.).
 *   - Replace spaces and any non-letter/digit run with a single hyphen.
 *   - Collapse consecutive hyphens, trim leading/trailing hyphens.
 *   - Cap length at MAX_SLUG_LEN (default 80) on a word boundary if possible.
 *   - Falls back to a generic placeholder if the result would be empty.
 *
 * The slug is purely cosmetic — the canonical key is always the trailing id.
 */

const MAX_SLUG_LEN = 80;
const FALLBACK_SLUG = 'item';

// Persian/Arabic letter normalisation (the same character can appear in different
// codepoints depending on keyboard/legacy data — collapse to canonical Persian).
const PERSIAN_NORMALISE: Record<string, string> = {
  '\u064A': '\u06CC', // ARABIC YEH → PERSIAN YEH
  '\u0649': '\u06CC', // ALEF MAKSURA → PERSIAN YEH
  '\u0643': '\u06A9', // ARABIC KAF → PERSIAN KEHEH
  '\u0629': '\u0647', // TEH MARBUTA → HEH
  '\u0624': '\u0648', // WAW WITH HAMZA → WAW
  '\u0623': '\u0627', // ALEF WITH HAMZA ABOVE → ALEF
  '\u0625': '\u0627', // ALEF WITH HAMZA BELOW → ALEF
  '\u0622': '\u0627', // ALEF WITH MADDA → ALEF
};

// Strip ranges: tatweel + Arabic harakat (vowel marks) + tashkeel + ZWNJ/ZWJ.
const STRIP_RE = /[\u0640\u064B-\u065F\u0670\u06D4\u06ED\u200C\u200D]/g;

/** Convert a free-form title into a SEO slug suitable for URL paths. */
export function slugifyTitle(input: string | null | undefined): string {
  if (!input) return FALLBACK_SLUG;

  let s = input.normalize('NFKC').toLowerCase();

  // Persian/Arabic normalisation
  s = s.replace(/[\u064A\u0649\u0643\u0629\u0624\u0623\u0625\u0622]/g, (ch) =>
    PERSIAN_NORMALISE[ch] ?? ch
  );
  s = s.replace(STRIP_RE, '');

  // Strip Latin diacritics
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // Replace any non letter/digit/Persian/Arabic with hyphen
  // \p{L} covers all Unicode letters; \p{N} covers numbers
  s = s.replace(/[^\p{L}\p{N}]+/gu, '-');

  // Collapse and trim hyphens
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');

  if (!s) return FALLBACK_SLUG;

  if (s.length > MAX_SLUG_LEN) {
    const truncated = s.slice(0, MAX_SLUG_LEN);
    const lastHyphen = truncated.lastIndexOf('-');
    s = lastHyphen > MAX_SLUG_LEN * 0.6 ? truncated.slice(0, lastHyphen) : truncated;
    s = s.replace(/-+$/g, '');
  }

  return s || FALLBACK_SLUG;
}

/**
 * Compare a slug from a URL against the canonical slug derived from the title.
 * Both inputs are URL-decoded by the caller.
 *
 * Persian characters in URLs may be percent-encoded (UTF-8); the comparison is
 * done on the decoded strings after re-slugifying both sides for symmetry.
 */
export function isCanonicalSlug(urlSlug: string, title: string): boolean {
  const expected = slugifyTitle(title);
  const got = slugifyTitle(decodeURIComponent(urlSlug));
  return expected === got;
}
