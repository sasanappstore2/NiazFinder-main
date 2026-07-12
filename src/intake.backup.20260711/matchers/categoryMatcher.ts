import type {
  CategoryIndexEntry,
  DictionaryMatcher,
  IntakeIndexes,
  MatchHit,
} from '@/intake/types';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';

function scoreMatch(matchType: MatchHit<CategoryIndexEntry>['matchType'], len: number): number {
  switch (matchType) {
    case 'exact':
      return Math.min(0.99, 0.88 + len * 0.01);
    case 'alias':
      return Math.min(0.95, 0.82 + len * 0.008);
    case 'ngram':
      return Math.min(0.92, 0.75 + len * 0.01);
    case 'token':
      return Math.min(0.85, 0.6 + len * 0.05);
    default:
      return 0.5;
  }
}

export class CategoryMatcher implements DictionaryMatcher<CategoryIndexEntry> {
  constructor(private readonly indexes: IntakeIndexes) {}

  match(tokens: readonly string[], ngrams: readonly string[]): MatchHit<CategoryIndexEntry>[] {
    const hits = new Map<string, MatchHit<CategoryIndexEntry>>();

    const consider = (phrase: string, matchType: MatchHit<CategoryIndexEntry>['matchType']) => {
      const key = normalizeLookupKey(phrase);
      if (key.length < 2) return;
      const slug = this.indexes.categoryLookup.get(key);
      if (!slug) return;
      const entry = this.indexes.categories.get(slug);
      if (!entry) return;
      const score = scoreMatch(matchType, key.length);
      const prev = hits.get(slug);
      if (!prev || score > prev.score) {
        hits.set(slug, { entry, matchedText: phrase, score, matchType });
      }
    };

    for (const ng of ngrams) consider(ng, ng.includes(' ') ? 'ngram' : 'token');
    for (const t of tokens) consider(t, 'token');

    return Array.from(hits.values()).sort((a, b) => b.score - a.score);
  }
}

export function bestCategoryMatch(
  indexes: IntakeIndexes,
  tokens: readonly string[],
  ngrams: readonly string[]
): MatchHit<CategoryIndexEntry> | null {
  const matcher = new CategoryMatcher(indexes);
  const hits = matcher.match(tokens, ngrams);
  return hits[0] ?? null;
}
