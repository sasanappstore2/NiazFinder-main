import type { CityIndexEntry, DictionaryMatcher, IntakeIndexes, MatchHit } from '@/intake/types';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';

export class CityMatcher implements DictionaryMatcher<CityIndexEntry> {
  constructor(private readonly indexes: IntakeIndexes) {}

  match(tokens: readonly string[], ngrams: readonly string[]): MatchHit<CityIndexEntry>[] {
    const hits = new Map<string, MatchHit<CityIndexEntry>>();

    const consider = (phrase: string, matchType: MatchHit<CityIndexEntry>['matchType']) => {
      const key = normalizeLookupKey(phrase);
      if (key.length < 2) return;
      const cityId = this.indexes.cityLookup.get(key);
      if (!cityId) return;
      const entry = this.indexes.cities.get(cityId);
      if (!entry) return;
      const score =
        matchType === 'exact'
          ? 0.98
          : matchType === 'ngram'
            ? Math.min(0.95, 0.8 + key.length * 0.015)
            : Math.min(0.9, 0.7 + key.length * 0.02);
      const prev = hits.get(cityId);
      if (!prev || score > prev.score) {
        hits.set(cityId, { entry, matchedText: phrase, score, matchType });
      }
    };

    for (const ng of ngrams) {
      consider(ng, ng.includes(' ') ? 'ngram' : 'token');
    }
    for (const t of tokens) {
      if (t.length >= 3) consider(t, 'token');
    }

    return Array.from(hits.values()).sort((a, b) => b.score - a.score);
  }
}

export function bestCityMatch(
  indexes: IntakeIndexes,
  tokens: readonly string[],
  ngrams: readonly string[]
): MatchHit<CityIndexEntry> | null {
  const matcher = new CityMatcher(indexes);
  return matcher.match(tokens, ngrams)[0] ?? null;
}
