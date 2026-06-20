import { displayAreaLabels } from '@/lib/neighborhoods/area-labels';
import type { ManagedNeighborhood } from '@/lib/locations/managed-types';
import { normalizeHoodFragment } from '@/lib/need-intake/location-fragment';

export interface ManagedNeighborhoodAmbiguityHit {
  neighborhood: ManagedNeighborhood;
  /** Sub-area or hood name that matched the user's phrase. */
  matchedLabel: string;
}

function compact(text: string): string {
  return text
    .replace(/\u200c/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function phraseTokens(phrase: string): string[] {
  return phrase
    .replace(/\u200c/g, ' ')
    .split(/[\s،,.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function firstNameToken(name: string): string {
  return phraseTokens(name)[0] ?? name.trim();
}

function countSubAreaPhraseMatches(
  neighborhoods: ManagedNeighborhood[],
  compactPhrase: string
): number {
  let count = 0;
  for (const n of neighborhoods) {
    for (const area of displayAreaLabels(n.areas, n.name)) {
      if (compact(area) === compactPhrase) {
        count++;
        break;
      }
    }
  }
  return count;
}

function findSingleExactSubAreaMatch(
  neighborhoods: ManagedNeighborhood[],
  compactPhrase: string
): ManagedNeighborhoodAmbiguityHit[] {
  for (const n of neighborhoods) {
    for (const area of displayAreaLabels(n.areas, n.name)) {
      if (compact(area) === compactPhrase) {
        return [{ neighborhood: n, matchedLabel: area !== n.name ? area : n.name }];
      }
    }
  }
  return [];
}

/**
 * Client-safe: find multiple catalog rows matching a location phrase
 * (e.g. ??????? as a sub-area under several Mashhad neighborhoods).
 */
export function findManagedNeighborhoodAmbiguity(
  neighborhoods: ManagedNeighborhood[],
  locationPhrase: string,
  _rawText?: string
): ManagedNeighborhoodAmbiguityHit[] {
  const phrase = normalizeHoodFragment(locationPhrase.trim()) || locationPhrase.trim();
  if (!phrase || neighborhoods.length === 0) return [];

  const compactPhrase = compact(phrase);
  const tokens = phraseTokens(phrase);
  const isMultiWordPhrase = tokens.length >= 2 || compactPhrase.length >= 8;
  const subAreaMatchCount = countSubAreaPhraseMatches(neighborhoods, compactPhrase);
  const isSharedSubAreaPhrase = subAreaMatchCount >= 2;

  if (subAreaMatchCount === 1) {
    return findSingleExactSubAreaMatch(neighborhoods, compactPhrase);
  }

  const hits = new Map<string, ManagedNeighborhoodAmbiguityHit>();

  const add = (n: ManagedNeighborhood, matchedLabel: string) => {
    const label = matchedLabel.trim();
    if (!label) return;
    const existing = hits.get(n.id);
    if (!existing || label.length > existing.matchedLabel.length) {
      hits.set(n.id, { neighborhood: n, matchedLabel: label });
    }
  };

  for (const n of neighborhoods) {
    const name = n.name.trim();
    const compactName = compact(name);

    if (compactName.length >= 3 && compactPhrase === compactName) {
      add(n, name);
      continue;
    }

    const firstTok = compact(firstNameToken(name));
    if (
      compactPhrase.length >= 2 &&
      (firstTok === compactPhrase ||
        compactName.startsWith(compactPhrase) ||
        compactPhrase.startsWith(firstTok))
    ) {
      add(n, name);
      continue;
    }

    if (
      !isSharedSubAreaPhrase &&
      !isMultiWordPhrase &&
      compactName.length >= 3 &&
      compactPhrase.includes(compactName)
    ) {
      add(n, name);
    }

    for (const area of displayAreaLabels(n.areas, n.name)) {
      const compactArea = compact(area);
      if (compactArea.length < 3) continue;

      const exactAreaHit = compactPhrase === compactArea;
      const phraseContainsArea =
        !isSharedSubAreaPhrase &&
        !isMultiWordPhrase &&
        compactPhrase.includes(compactArea) &&
        compactArea.length >= 3;
      const tokenHit =
        !isSharedSubAreaPhrase &&
        !isMultiWordPhrase &&
        tokens.some((t) => {
          const ct = compact(t);
          if (ct.length < 2) return false;
          if (ct === compactArea) return true;
          return ct.length >= 4 && compactArea.includes(ct);
        });

      if (exactAreaHit || phraseContainsArea || tokenHit) {
        add(n, area !== name ? area : name);
      }
    }
  }

  let results = [...hits.values()];

  if (isSharedSubAreaPhrase) {
    results = results.filter((h) => {
      const cm = compact(h.matchedLabel);
      const cn = compact(h.neighborhood.name);
      const firstTok = compact(firstNameToken(h.neighborhood.name));
      return (
        cm === compactPhrase ||
        cn === compactPhrase ||
        cn.startsWith(compactPhrase) ||
        firstTok === compactPhrase
      );
    });
  }

  return results.sort((a, b) => {
    const aName = compact(a.neighborhood.name);
    const bName = compact(b.neighborhood.name);
    const phraseLead = compact(tokens[0] ?? phrase);
    const aNameLead =
      aName.startsWith(phraseLead) || compact(firstNameToken(a.neighborhood.name)) === phraseLead
        ? 2
        : 0;
    const bNameLead =
      bName.startsWith(phraseLead) || compact(firstNameToken(b.neighborhood.name)) === phraseLead
        ? 2
        : 0;
    if (aNameLead !== bNameLead) return bNameLead - aNameLead;
    const aExact = compact(a.matchedLabel) === phraseLead ? 1 : 0;
    const bExact = compact(b.matchedLabel) === phraseLead ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    if (aName === phraseLead && bName !== phraseLead) return -1;
    if (bName === phraseLead && aName !== phraseLead) return 1;
    return a.neighborhood.name.localeCompare(b.neighborhood.name, 'fa');
  });
}
