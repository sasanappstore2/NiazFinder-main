import type {
  DictionaryMatcher,
  IntakeIndexes,
  MatchHit,
  NeighborhoodIndexEntry,
} from '@/intake/types';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';
import { isDealTypeLocationToken, isAreaUnitSubstring } from '@/lib/need-intake/neighborhood-catalog.server';

export class NeighborhoodMatcher implements DictionaryMatcher<NeighborhoodIndexEntry> {
  constructor(
    private readonly indexes: IntakeIndexes,
    private readonly preferredCityId?: string | null,
    private readonly sourceText?: string
  ) {}

  match(tokens: readonly string[], ngrams: readonly string[]): MatchHit<NeighborhoodIndexEntry>[] {
    const hits = new Map<string, MatchHit<NeighborhoodIndexEntry>>();
    const context = this.sourceText ?? tokens.join(' ');

    const consider = (
      phrase: string,
      matchType: MatchHit<NeighborhoodIndexEntry>['matchType']
    ) => {
      const key = normalizeLookupKey(phrase);
      if (key.length < 3) return;
      if (isDealTypeLocationToken(key, context)) return;
      if (isAreaUnitSubstring(context, key)) return;
      const slugs = this.indexes.neighborhoodLookup.get(key);
      if (!slugs?.length) return;

      for (const slug of slugs) {
        const entry = this.indexes.neighborhoods.get(slug);
        if (!entry) continue;
        if (this.preferredCityId && entry.cityId !== this.preferredCityId) {
          continue;
        }

        let score =
          matchType === 'exact'
            ? Math.min(0.99, 0.85 + key.length * 0.01)
            : matchType === 'alias'
              ? 0.92
              : Math.min(0.9, 0.72 + key.length * 0.012);

        if (this.preferredCityId && entry.cityId === this.preferredCityId) {
          score = Math.min(0.99, score + 0.14);
        }

        const prev = hits.get(slug);
        if (!prev || score > prev.score) {
          hits.set(slug, { entry, matchedText: phrase, score, matchType });
        }
      }
    };

    // Prefer longer n-grams first (multi-word neighborhood names)
    const sortedNgrams = [...ngrams].sort((a, b) => b.length - a.length);
    for (const ng of sortedNgrams) {
      consider(ng, ng.includes(' ') ? 'exact' : 'alias');
    }
    for (const t of tokens) {
      if (t.length >= 4) consider(t, 'token');
    }

    return Array.from(hits.values()).sort((a, b) => b.score - a.score);
  }
}

export function bestNeighborhoodMatch(
  indexes: IntakeIndexes,
  tokens: readonly string[],
  ngrams: readonly string[],
  preferredCityId?: string | null,
  sourceText?: string
): MatchHit<NeighborhoodIndexEntry> | null {
  const matcher = new NeighborhoodMatcher(indexes, preferredCityId, sourceText);
  return matcher.match(tokens, ngrams)[0] ?? null;
}
