import { promises as fs } from 'fs';
import path from 'path';
import { makeLocationId } from '@/lib/admin-locations';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import type {
  CityNeighborhoodCatalog,
  CatalogNeighborhood,
  NeighborhoodManifest,
} from '@/lib/neighborhoods/catalog-types';

const NEIGHBORHOODS_ROOT = path.join(process.cwd(), 'src', 'data', 'neighborhoods');
const CATALOG_DIR = path.join(NEIGHBORHOODS_ROOT, 'catalog');
const MANIFEST_PATH = path.join(NEIGHBORHOODS_ROOT, 'manifest.json');

const catalogCache = new Map<string, ManagedNeighborhood[]>();
let manifestCache: NeighborhoodManifest | null = null;

export type { CityNeighborhoodCatalog, CatalogNeighborhood, NeighborhoodManifest };

export function catalogFilePath(cityId: string): string {
  return path.join(CATALOG_DIR, `${cityId}.json`);
}

export function catalogNeighborhoodToManaged(
  n: CatalogNeighborhood,
  order: number
): ManagedNeighborhood {
  return {
    id: n.id,
    name: n.name,
    nameEn: n.nameEn ?? n.id,
    ...(n.areas?.length ? { areas: n.areas } : {}),
    isActive: true,
    order,
  };
}

export function managedToCatalogNeighborhood(n: ManagedNeighborhood): CatalogNeighborhood {
  return {
    id: n.id,
    name: n.name,
    nameEn: n.nameEn,
    ...(n.areas?.length ? { areas: n.areas } : {}),
  };
}

export async function readManifest(): Promise<NeighborhoodManifest> {
  if (manifestCache) return manifestCache;
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
    manifestCache = JSON.parse(raw) as NeighborhoodManifest;
    return manifestCache;
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      citiesWithNeighborhoods: 0,
      totalNeighborhoods: 0,
      counts: {},
      emptyOnDivar: [],
      unmapped: [],
    };
  }
}

export async function writeManifest(manifest: NeighborhoodManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  await fs.mkdir(NEIGHBORHOODS_ROOT, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  manifestCache = manifest;
}

export async function cityHasNeighborhoods(cityId: string): Promise<boolean> {
  const manifest = await readManifest();
  return (manifest.counts[cityId] ?? 0) > 0;
}

export async function loadCityCatalogFile(
  cityId: string
): Promise<CityNeighborhoodCatalog | null> {
  try {
    const raw = await fs.readFile(catalogFilePath(cityId), 'utf8');
    return JSON.parse(raw) as CityNeighborhoodCatalog;
  } catch {
    return null;
  }
}

/** Map location-system city id (e.g. tehran-city) to on-disk catalog file id (e.g. tehran). */
export function resolveCatalogCityId(cityId: string): string {
  return locationCityIdToSlug(cityId);
}

/** Candidate catalog file ids for a location-system city id (handles tehran-city vs tehran). */
export function resolveCatalogCityIdCandidates(cityId: string): string[] {
  const slug = resolveCatalogCityId(cityId);
  const candidates = [cityId, slug];
  if (!cityId.endsWith('-city')) candidates.push(`${slug}-city`);
  return [...new Set(candidates.filter(Boolean))];
}

export async function loadCityNeighborhoods(cityId: string): Promise<ManagedNeighborhood[]> {
  for (const catalogCityId of resolveCatalogCityIdCandidates(cityId)) {
    const cached = catalogCache.get(catalogCityId);
    if (cached) return cached;

    const file = await loadCityCatalogFile(catalogCityId);
    if (!file?.neighborhoods?.length) continue;

    const list = file.neighborhoods
      .map((n, i) => catalogNeighborhoodToManaged(n, i + 1))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa'));

    catalogCache.set(catalogCityId, list);
    catalogCache.set(cityId, list);
    return list;
  }

  catalogCache.set(cityId, []);
  return [];
}

export async function saveCityCatalog(
  cityId: string,
  payload: Omit<CityNeighborhoodCatalog, 'cityId' | 'importedAt'> & {
    cityName?: string;
    importedAt?: string;
  }
): Promise<ManagedNeighborhood[]> {
  const catalog: CityNeighborhoodCatalog = {
    cityId,
    cityName: payload.cityName,
    source: payload.source,
    importedAt: payload.importedAt ?? new Date().toISOString(),
    emptyOnDivar: payload.emptyOnDivar,
    neighborhoods: payload.neighborhoods,
  };

  await fs.mkdir(CATALOG_DIR, { recursive: true });
  await fs.writeFile(catalogFilePath(cityId), JSON.stringify(catalog, null, 2), 'utf8');

  const managed = catalog.neighborhoods.map((n, i) => catalogNeighborhoodToManaged(n, i + 1));
  catalogCache.set(cityId, managed);
  manifestCache = null;
  return managed;
}

/** Build unique slug ids for district names within a city. */
export function slugifyNeighborhoodNames(
  names: { name: string; areas?: string[] }[]
): CatalogNeighborhood[] {
  const used = new Set<string>();
  return names.map(({ name, areas }) => {
    let base = makeLocationId(name);
    if (!base) base = `loc-${used.size + 1}`;
    let id = base;
    let counter = 2;
    while (used.has(id)) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    used.add(id);
    return {
      id,
      name,
      nameEn: id,
      ...(areas?.length ? { areas } : {}),
    };
  });
}

export async function listCatalogCityIds(): Promise<string[]> {
  try {
    const files = await fs.readdir(CATALOG_DIR);
    return files.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

export async function rebuildManifestFromCatalog(): Promise<NeighborhoodManifest> {
  const ids = await listCatalogCityIds();
  const counts: Record<string, number> = {};
  let total = 0;
  let withData = 0;

  for (const cityId of ids) {
    const file = await loadCityCatalogFile(cityId);
    const n = file?.neighborhoods?.length ?? 0;
    if (n > 0) {
      counts[cityId] = n;
      total += n;
      withData += 1;
    }
  }

  const manifest: NeighborhoodManifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    citiesWithNeighborhoods: withData,
    totalNeighborhoods: total,
    counts,
    emptyOnDivar: [],
    unmapped: [],
  };

  await writeManifest(manifest);
  return manifest;
}

export function clearCatalogCache(): void {
  catalogCache.clear();
  manifestCache = null;
}
