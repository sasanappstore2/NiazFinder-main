import type { IntakeIndexes } from '@/intake/types';
import { buildCategoryIndex } from '@/intake/dictionaries/categoryIndex';
import { buildCityIndex } from '@/intake/dictionaries/cityIndex';
import { buildNeighborhoodIndex } from '@/intake/dictionaries/neighborhoodIndex';
import { listCatalogCityIds, loadCityCatalogFile } from '@/lib/neighborhoods/catalog';
import { db } from '@/lib/db';
import { getPublicCategoryWhere } from '@/lib/categories/category-status';

let indexesPromise: Promise<IntakeIndexes> | null = null;

async function loadExtraCategorySynonyms(): Promise<Record<string, readonly string[]>> {
  try {
    const rows = await db.category.findMany({
      where: getPublicCategoryWhere(),
      select: { slug: true, name: true, description: true },
    });
    const extra: Record<string, string[]> = {};
    for (const row of rows) {
      const syns = [row.name, row.description ?? ''].filter(Boolean);
      if (syns.length) extra[row.slug] = syns;
    }
    return extra;
  } catch {
    return {};
  }
}

async function loadNeighborhoodRows(): Promise<
  Array<{ cityId: string; cityName: string; id: string; name: string; areas?: string[] }>
> {
  const cityIds = await listCatalogCityIds();
  const rows: Array<{
    cityId: string;
    cityName: string;
    id: string;
    name: string;
    areas?: string[];
  }> = [];

  const CONCURRENCY = 12;
  for (let i = 0; i < cityIds.length; i += CONCURRENCY) {
    const batch = cityIds.slice(i, i + CONCURRENCY);
    const files = await Promise.all(batch.map((cityId) => loadCityCatalogFile(cityId)));
    for (let j = 0; j < batch.length; j += 1) {
      const cityId = batch[j]!;
      const file = files[j];
      if (!file?.neighborhoods?.length) continue;
      const cityName = file.cityName ?? cityId;
      for (const n of file.neighborhoods) {
        rows.push({
          cityId,
          cityName,
          id: n.id,
          name: n.name,
          areas: n.areas,
        });
      }
    }
  }
  return rows;
}

/**
 * Load all dictionaries into memory once. Subsequent analysis uses only these maps.
 */
export async function loadIntakeIndexes(): Promise<IntakeIndexes> {
  const [extraSynonyms, neighborhoodRows] = await Promise.all([
    loadExtraCategorySynonyms(),
    loadNeighborhoodRows(),
  ]);

  const { categories, categoryLookup } = buildCategoryIndex(extraSynonyms);
  const { cities, cityLookup } = buildCityIndex();
  const { neighborhoods, neighborhoodLookup } = buildNeighborhoodIndex(neighborhoodRows);

  return {
    categories,
    categoryLookup,
    cities,
    cityLookup,
    neighborhoods,
    neighborhoodLookup,
    loadedAt: Date.now(),
    stats: {
      categories: categories.size,
      cities: cities.size,
      neighborhoods: neighborhoods.size,
      synonyms: categoryLookup.size,
    },
  };
}

/** Singleton accessor — first call loads indexes; analysis never hits DB. */
export function getIntakeIndexes(): Promise<IntakeIndexes> {
  if (!indexesPromise) {
    indexesPromise = loadIntakeIndexes();
  }
  return indexesPromise;
}

/** Test-only: reset cached indexes. */
export function resetIntakeIndexesCache(): void {
  indexesPromise = null;
}

/** Synchronous build from in-memory sources only (tests, no DB). */
export function buildIntakeIndexesSync(
  neighborhoodRows: Array<{
    cityId: string;
    cityName: string;
    id: string;
    name: string;
    areas?: string[];
  }> = []
): IntakeIndexes {
  const { categories, categoryLookup } = buildCategoryIndex();
  const { cities, cityLookup } = buildCityIndex();
  const { neighborhoods, neighborhoodLookup } = buildNeighborhoodIndex(neighborhoodRows);

  return {
    categories,
    categoryLookup,
    cities,
    cityLookup,
    neighborhoods,
    neighborhoodLookup,
    loadedAt: Date.now(),
    stats: {
      categories: categories.size,
      cities: cities.size,
      neighborhoods: neighborhoods.size,
      synonyms: categoryLookup.size,
    },
  };
}
