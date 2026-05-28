import type { NeighborhoodIndexEntry } from '@/intake/types';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';
import { makeLocationId } from '@/lib/admin-locations';

export interface NeighborhoodIndexBuild {
  neighborhoods: Map<string, NeighborhoodIndexEntry>;
  neighborhoodLookup: Map<string, string[]>;
}

function slugifyNeighborhood(name: string, cityId: string): string {
  const base = makeLocationId(name);
  return base || `${cityId}-${name.slice(0, 12)}`;
}

/** Generate searchable sub-phrases from a multi-word neighborhood name. */
function nameSubPhrases(name: string): string[] {
  const parts = name.split(/\s+/).filter((p) => p.length >= 2);
  const phrases: string[] = [name];
  if (parts.length >= 2) {
    for (let i = 0; i < parts.length - 1; i += 1) {
      phrases.push(parts.slice(i).join(' '));
      if (i < parts.length - 1) {
        phrases.push(`${parts[i]} ${parts[i + 1]}`);
      }
    }
  }
  return Array.from(new Set(phrases));
}

export function buildNeighborhoodIndex(
  rows: Array<{
    cityId: string;
    cityName: string;
    id: string;
    name: string;
    areas?: string[];
  }>
): NeighborhoodIndexBuild {
  const neighborhoods = new Map<string, NeighborhoodIndexEntry>();
  const neighborhoodLookup = new Map<string, string[]>();

  const addLookup = (phrase: string, slug: string) => {
    const key = normalizeLookupKey(phrase);
    if (key.length < 2) return;
    const existing = neighborhoodLookup.get(key) ?? [];
    if (!existing.includes(slug)) existing.push(slug);
    neighborhoodLookup.set(key, existing);
  };

  for (const row of rows) {
    const slug = slugifyNeighborhood(row.name, row.cityId);
    const entry: NeighborhoodIndexEntry = {
      slug,
      name: row.name,
      cityId: row.cityId,
      cityName: row.cityName,
      aliases: row.areas ?? [],
    };
    neighborhoods.set(slug, entry);

    addLookup(row.name, slug);
    addLookup(row.id, slug);
    for (const phrase of nameSubPhrases(row.name)) {
      addLookup(phrase, slug);
    }
    for (const area of row.areas ?? []) {
      addLookup(area, slug);
    }
  }

  return { neighborhoods, neighborhoodLookup };
}
