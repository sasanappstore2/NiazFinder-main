import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { isStopWord } from '@/intake/normalizer/stopWords';

export interface TokenizeOptions {
  /** When true, remove stop words from output tokens. */
  removeStopWords?: boolean;
}

/**
 * Split normalized text into tokens for n-gram generation and matching.
 */
export function tokenize(text: string, options: TokenizeOptions = {}): string[] {
  const normalized = normalizePersian(text);
  if (!normalized) return [];

  const raw = normalized.split(/[\s،,.]+/).filter((t) => t.length >= 1);
  if (!options.removeStopWords) return raw;

  return raw.filter((t) => !isStopWord(t) && t.length >= 2);
}
