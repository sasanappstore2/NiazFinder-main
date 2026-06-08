import knownAreasData from '@/data/neighborhoods/known-areas.json';

/** Colloquial neighborhood / street labels for intake area hints (generated from catalogs). */
export function getKnownAreasForCity(cityId?: string | null): string[] {
  const slug = cityId?.trim();
  if (slug && knownAreasData.byCity[slug]?.length) {
    return knownAreasData.byCity[slug]!;
  }
  return knownAreasData.areas;
}

/** Longest-match-first area labels (global priority cities). */
export const KNOWN_AREAS_FROM_CATALOG: readonly string[] = knownAreasData.areas;
