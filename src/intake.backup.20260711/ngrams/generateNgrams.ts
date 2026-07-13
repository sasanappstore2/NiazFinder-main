export interface NGramSet {
  unigrams: string[];
  bigrams: string[];
  trigrams: string[];
  /** All n-grams flattened (deduped). */
  all: string[];
}

/**
 * Generate 1/2/3-grams from token sequence for dictionary matching.
 */
export function generateNgrams(tokens: readonly string[]): NGramSet {
  const unigrams = [...tokens];
  const bigrams: string[] = [];
  const trigrams: string[] = [];

  for (let i = 0; i < tokens.length - 1; i += 1) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  for (let i = 0; i < tokens.length - 2; i += 1) {
    trigrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }

  const all = Array.from(new Set([...unigrams, ...bigrams, ...trigrams]));
  return { unigrams, bigrams, trigrams, all };
}
