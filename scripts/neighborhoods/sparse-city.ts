/**
 * Detect cities whose neighborhood catalog is thin (often a single city-name fallback).
 */
import type { CityNeighborhoodCatalog } from '../../src/lib/neighborhoods/catalog-types';
import { normalizePersianName } from './lib';

/** Cities with at most this many hoods are candidates for OSM re-import. */
export const DEFAULT_SPARSE_MAX_COUNT = 3;

export function isSparseCityCatalog(
  catalog: CityNeighborhoodCatalog | null,
  cityName: string,
  maxCount: number = DEFAULT_SPARSE_MAX_COUNT
): boolean {
  const count = catalog?.neighborhoods?.length ?? 0;
  if (count === 0) return true;
  if (count > maxCount) return false;

  if (count === 1) {
    const hood = catalog!.neighborhoods[0]!;
    const hoodNorm = normalizePersianName(hood.name);
    const cityNorm = normalizePersianName(cityName);
    if (hoodNorm === cityNorm) return true;
    if (catalog!.emptyOnDivar) return true;
    if (hood.geoSource === 'synthetic') return true;
  }

  return count <= maxCount;
}
