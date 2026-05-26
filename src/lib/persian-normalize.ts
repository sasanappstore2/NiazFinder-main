/**
 * Persian text normalization and fuzzy matching utilities.
 * Handles common Persian character variations for search.
 *
 * Features:
 * - Alef variants: آ, أ, إ → ا
 * - Arabic/Persian letter differences: ك→ک, ي→ی
 * - Ta marbuta: ة → ه
 * - Waw/Ya with hamza: ؤ→و, ئ→ی
 * - Persian digits: ۰-۹ → 0-9
 * - Arabic digits: ٠-٩ → 0-9
 * - Remove tashkil (diacritics): fatha, damma, kasra, shadda, sukun
 * - Remove zero-width characters: ZWNJ, ZWJ, ZWS, BOM
 * - Normalize whitespace
 * - Levenshtein distance for fuzzy matching (1-char tolerance)
 */

// ─── Character normalization map ─────────────────────────────────────────────

const NORMALIZATION_MAP: Record<string, string> = {
  // Alef variations
  'آ': 'ا',     // Alef with madda → Alef
  'أ': 'ا',     // Alef with hamza above → Alef
  'إ': 'ا',     // Alef with hamza below → Alef

  // Ye variations
  'ي': 'ی',     // Arabic Ye → Persian Ye
  'ئ': 'ی',     // Ye with hamza → Ye

  // Ke variations
  'ك': 'ک',     // Arabic Ke → Persian Ke

  // Te variations
  'ة': 'ه',     // Ta marbuta → He

  // Waw with hamza
  'ؤ': 'و',     // Waw with hamza → Waw

  // Diacritics removal (tashkil)
  'ّ': '',      // Shadda
  'ً': '',      // Fathatan
  'ٌ': '',      // Dammatan
  'ٍ': '',      // Kasratan
  'َ': '',      // Fatha
  'ُ': '',      // Damma
  'ِ': '',      // Kasra
  'ْ': '',      // Sukun
  'ٰ': '',      // Madda above
};

// Persian digits
const PERSIAN_DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

// Arabic-Indic digits
const ARABIC_DIGIT_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

// Zero-width characters
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u00AD]/g;

// ─── Normalize a single string for fuzzy comparison ─────────────────────────

/**
 * Normalize Persian/Arabic text for comparison.
 * - Removes diacritics (tashkeel)
 * - Standardizes character variations (آ→ا, ي→ی, ك→ک, ة→ه)
 * - Converts Persian/Arabic digits to English
 * - Removes zero-width characters
 * - Converts to lowercase for English
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  let result = text;

  // Remove BOM at start
  if (result.charCodeAt(0) === 0xFEFF) {
    result = result.slice(1);
  }

  // Remove zero-width characters (ZWNJ, ZWJ, ZWS, soft hyphen)
  result = result.replace(ZERO_WIDTH_REGEX, '');

  // Apply character normalization map
  result = result
    .split('')
    .map(char => NORMALIZATION_MAP[char] || char)
    .join('');

  // Convert Persian digits to English
  for (const [fa, en] of Object.entries(PERSIAN_DIGIT_MAP)) {
    result = result.replace(new RegExp(fa, 'g'), en);
  }

  // Convert Arabic-Indic digits to English
  for (const [ar, en] of Object.entries(ARABIC_DIGIT_MAP)) {
    result = result.replace(new RegExp(ar, 'g'), en);
  }

  // Normalize multiple spaces
  result = result.replace(/\s+/g, ' ').trim();

  // Lowercase (for any Latin characters)
  result = result.toLowerCase();

  return result;
}

/** @deprecated Use normalizeText instead */
export const normalizePersian = normalizeText;

/**
 * Calculate Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits needed.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if two strings match with fuzzy tolerance.
 * @param query - The search query
 * @param target - The text to match against
 * @param maxDistance - Maximum Levenshtein distance (default: 1 for 1-char tolerance)
 */
export function fuzzyMatch(query: string, target: string, maxDistance: number = 1): boolean {
  if (!query || !target) return false;

  const normalizedQuery = normalizeText(query);
  const normalizedTarget = normalizeText(target);

  if (!normalizedQuery || !normalizedTarget) return false;

  // Exact match after normalization
  if (normalizedTarget === normalizedQuery) return true;

  // Contains match
  if (normalizedTarget.includes(normalizedQuery)) return true;
  if (normalizedQuery.includes(normalizedTarget)) return true;

  // Fuzzy match with Levenshtein distance (only for queries of reasonable length)
  if (normalizedQuery.length >= 2) {
    const distance = levenshteinDistance(normalizedQuery, normalizedTarget);
    if (distance <= maxDistance) return true;
  }

  return false;
}

/**
 * Calculate a fuzzy match score (0-1). Higher is better match.
 * Uses a combination of:
 * - Exact match bonus (1.0)
 * - Start-of-string bonus (0.9)
 * - Contains match bonus (0.8)
 * - Reverse contains (0.7)
 * - Levenshtein 1-char tolerance (0.5)
 * - Levenshtein 2-char tolerance (0.3)
 * - Word-level partial match (0.4)
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;

  const normalizedQuery = normalizeText(query);
  const normalizedTarget = normalizeText(target);

  if (!normalizedQuery || !normalizedTarget) return 0;

  // Exact match
  if (normalizedTarget === normalizedQuery) return 1.0;

  // Starts with query
  if (normalizedTarget.startsWith(normalizedQuery)) return 0.9;

  // Contains query
  if (normalizedTarget.includes(normalizedQuery)) return 0.8;

  // Query contains target
  if (normalizedQuery.includes(normalizedTarget)) return 0.7;

  // Fuzzy match via Levenshtein
  if (normalizedQuery.length >= 2) {
    const distance = levenshteinDistance(normalizedQuery, normalizedTarget);
    if (distance <= 1) return 0.5;
    if (distance <= 2) return 0.3;
  }

  // Word-level matching (split by spaces)
  const queryWords = normalizedQuery.split(/\s+/);
  const targetWords = normalizedTarget.split(/\s+/);
  let wordMatches = 0;
  for (const qWord of queryWords) {
    if (targetWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      wordMatches++;
    }
  }
  if (wordMatches > 0) return 0.4 * (wordMatches / queryWords.length);

  return 0;
}

/**
 * Search through a list of items with fuzzy matching.
 * Returns items sorted by relevance score.
 *
 * @param items - Array of items to search
 * @param query - Search query string
 * @param fields - Functions that extract searchable strings from each item
 * @param maxDistance - Maximum Levenshtein distance for fuzzy match
 * @param minScore - Minimum score threshold for results
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  fields: Array<(item: T) => string> | ((item: T) => string[]),
  maxDistance: number = 1,
  minScore: number = 0.3
): { item: T; score: number }[] {
  if (!query || !items.length) return [];

  const results: { item: T; score: number }[] = [];
  const resolveFields =
    typeof fields === 'function' && !Array.isArray(fields)
      ? (item: T) => fields(item)
      : (item: T) => (fields as Array<(item: T) => string>).map((fn) => fn(item));

  for (const item of items) {
    let bestScore = 0;

    for (const fieldValue of resolveFields(item)) {
      if (!fieldValue) continue;

      const score = fuzzyScore(query, fieldValue);
      if (score > bestScore) {
        bestScore = score;
      }
    }

    if (bestScore >= minScore) {
      results.push({ item, score: bestScore });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─── Legacy convenience functions (backward compatible) ────────────────────

/**
 * Check if a haystack contains a needle using fuzzy Persian matching.
 * Both strings are normalized before comparison.
 * @deprecated Use fuzzyMatch instead
 */
export function fuzzyPersianIncludes(haystack: string, needle: string): boolean {
  if (!needle) return true;
  if (!haystack) return false;

  const normalizedHaystack = normalizeText(haystack);
  const normalizedNeedle = normalizeText(needle);

  if (!normalizedNeedle) return true;

  return normalizedHaystack.includes(normalizedNeedle);
}

/**
 * Calculate a fuzzy match score between two strings.
 * Returns 0-1 where 1 is a perfect match.
 * @deprecated Use fuzzyScore instead
 */
export function fuzzyPersianScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  if (!haystack) return 0;

  const normalizedHaystack = normalizeText(haystack);
  const normalizedNeedle = normalizeText(needle);

  if (!normalizedNeedle) return 0;

  // Exact match gets highest score
  if (normalizedHaystack === normalizedNeedle) return 1;

  // Contains match
  const index = normalizedHaystack.indexOf(normalizedNeedle);
  if (index !== -1) {
    // Bonus for starts-with
    if (index === 0) return 0.9;
    // Bonus for word boundary match
    if (normalizedHaystack[index - 1] === ' ') return 0.85;
    // Regular contains
    return 0.7;
  }

  // Check individual characters (for single-char search)
  if (normalizedNeedle.length === 1) {
    return normalizedHaystack.includes(normalizedNeedle) ? 0.5 : 0;
  }

  return 0;
}

/**
 * Filter an array of objects by checking if any of the specified fields
 * fuzzy-match the query string. Returns objects sorted by best match score.
 * @deprecated Use fuzzySearch instead
 */
export function fuzzyFilterByFields<T>(
  items: T[],
  query: string,
  fields: (keyof T)[],
  minScore: number = 0.5
): T[] {
  if (!query || !query.trim()) return items;

  const q = query.trim();
  const scored = items
    .map((item) => {
      let bestScore = 0;
      for (const field of fields) {
        const value = item[field];
        if (typeof value === 'string') {
          const score = fuzzyPersianScore(value, q);
          if (score > bestScore) bestScore = score;
        }
      }
      return { item, score: bestScore };
    })
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.map((entry) => entry.item);
}
