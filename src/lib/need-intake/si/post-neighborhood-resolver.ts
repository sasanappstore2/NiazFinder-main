import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { normalizeHoodFragment } from '@/lib/need-intake/location-fragment';
import { resolveTextNeighborhoodInCity } from '@/lib/need-intake/resolve-text-neighborhood';

export interface PostNeighborhoodResolution {
  hit?: ManagedNeighborhood;
  candidates: ManagedNeighborhood[];
}

function compact(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[يى]/gu, 'ی')
    .replace(/ك/gu, 'ک')
    .replace(/[ۀة]/gu, 'ه')
    .replace(/[\u200c\u200d\u0640]/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();
}

/** Bounded to one insertion/deletion/substitution; no broad substring guessing. */
function hasAtMostOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1 || Math.min(left.length, right.length) < 7) {
    return false;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (left.length > right.length) i++;
    else if (right.length > left.length) j++;
    else {
      i++;
      j++;
    }
  }
  if (i < left.length || j < right.length) edits++;
  return edits <= 1;
}

function editDistanceAtMost(left: string, right: string, maxDistance: number): number {
  if (Math.abs(left.length - right.length) > maxDistance) return maxDistance + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      const value = Math.min(
        current[j - 1]! + 1,
        previous[j]! + 1,
        previous[j - 1]! + cost
      );
      current[j] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maxDistance) return maxDistance + 1;
    previous = current;
  }
  return previous[right.length] ?? maxDistance + 1;
}

function findTypoSuggestions(
  neighborhoods: ManagedNeighborhood[],
  phrase: string,
  sourceText: string
): ManagedNeighborhood[] {
  if (!/(?:محدوده|محله|منطقه|حوالی|اطراف|حاشیه|نزدیک|دور\s*و\s*بر|در|توی|تو)\s+/u.test(sourceText)) {
    return [];
  }

  const target = compact(normalizeHoodFragment(phrase));
  if (target.length < 7 || target.length > 32) return [];

  const bestById = new Map<string, { neighborhood: ManagedNeighborhood; distance: number; ratio: number }>();
  for (const neighborhood of neighborhoods) {
    const labels = [
      neighborhood.name,
      neighborhood.name.replace(/^(?:شهید|سید|آیت\s+الله)\s+/u, ''),
      ...(neighborhood.areas ?? []),
    ];
    for (const label of labels) {
      const candidate = compact(label);
      if (candidate.length < 7 || candidate.length > 32) continue;
      const distance = editDistanceAtMost(target, candidate, 2);
      const ratio = 1 - distance / Math.max(target.length, candidate.length);
      if (distance < 1 || distance > 2 || ratio < 0.76) continue;
      const previous = bestById.get(neighborhood.id);
      if (!previous || distance < previous.distance || (distance === previous.distance && ratio > previous.ratio)) {
        bestById.set(neighborhood.id, { neighborhood, distance, ratio });
      }
    }
  }

  const ranked = [...bestById.values()].sort(
    (a, b) => a.distance - b.distance || b.ratio - a.ratio || a.neighborhood.name.localeCompare(b.neighborhood.name, 'fa')
  );
  if (!ranked.length) return [];
  const closestDistance = ranked[0]!.distance;
  // These are review-only suggestions: two-edit matches never auto-apply.
  return ranked
    .filter((candidate) => candidate.distance === closestDistance)
    .slice(0, 4)
    .map((candidate) => candidate.neighborhood);
}

function resolveSingleTypo(
  neighborhoods: ManagedNeighborhood[],
  phrase: string,
  sourceText: string
): PostNeighborhoodResolution {
  // Fuzzy matching is only safe after an explicit spatial cue and against the
  // bounded location phrase, never against the whole need text (where words
  // such as «عباسی» can collide with unrelated aliases in another city).
  if (!/(?:محدوده|محله|منطقه|حوالی|اطراف|حاشیه|نزدیک|دور\s*و\s*بر|در|توی|تو)\s+/u.test(sourceText)) {
    return { candidates: [] };
  }
  const target = compact(normalizeHoodFragment(phrase));
  if (target.length < 7 || target.length > 32) return { candidates: [] };

  const candidates = new Map<string, ManagedNeighborhood>();
  for (const neighborhood of neighborhoods) {
    const labels = [
      neighborhood.name,
      neighborhood.name.replace(/^(?:شهید|سید|آیت\s+الله)\s+/u, ''),
      ...(neighborhood.areas ?? []),
    ];
    if (labels.some((label) => hasAtMostOneEdit(target, compact(label)))) {
      candidates.set(neighborhood.id, neighborhood);
    }
  }
  const matches = [...candidates.values()];
  return matches.length === 1
    ? { hit: matches[0], candidates: [] }
    : { candidates: matches.slice(0, 8) };
}

/** Resolve an exact/unique city-catalog match before surfacing alias ambiguity. */
export function resolvePostNeighborhoodInCity(
  neighborhoods: ManagedNeighborhood[],
  phrase: string,
  cityName: string,
  sourceText?: string
): PostNeighborhoodResolution {
  // Keep the analysis API and the form's post-analysis reconciliation on one
  // city-scoped resolver. The raw text matters for constructions such as
  // «حاشیهٔ فردوسی بین ...» where the extracted phrase also contains landmarks.
  const explicit = resolveTextNeighborhoodInCity(
    neighborhoods,
    sourceText?.trim() || phrase,
    cityName
  );
  if (explicit.hit || explicit.candidates.length) return explicit;

  const text = sourceText ?? '';
  const typo = resolveSingleTypo(neighborhoods, phrase, text);
  if (typo.hit || typo.candidates.length) return typo;
  return { candidates: findTypoSuggestions(neighborhoods, phrase, text) };
}
