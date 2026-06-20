/**
 * Fill neighborhood catalogs from OpenStreetMap for cities missing Divar data.
 *
 * Run:
 *   npm run neighborhoods:import:osm
 *   npm run neighborhoods:import:osm -- --city=tabriz
 *   npm run neighborhoods:import:osm -- --force
 *   npm run neighborhoods:import:sparse
 */
import {
  loadAdminCities,
  normalizePersianName,
  parseArgs,
  sleep,
  type AdminCityRef,
} from './lib';
import { mergeCatalogNeighborhoods } from './divar-districts';
import {
  DEFAULT_SPARSE_MAX_COUNT,
  isSparseCityCatalog,
} from './sparse-city';
import {
  loadCityCatalogFile,
  readManifest,
  resolveCatalogCityIdCandidates,
  saveCityCatalog,
  slugifyNeighborhoodNames,
  rebuildManifestFromCatalog,
} from '../../src/lib/neighborhoods/catalog';
import type { CityNeighborhoodCatalog } from '../../src/lib/neighborhoods/catalog-types';
import { makeLocationId } from '../../src/lib/admin-locations';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'NiazFinder-NeighborhoodImport/1.0 (contact@needfinder.ir)';
const NOMINATIM_DELAY_MS = 1100;
const OVERPASS_DELAY_MS = 1200;
const MIN_EXISTING_TO_SKIP = 5;

interface GeocodeHit {
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

export interface OsmImportOptions {
  merge?: boolean;
  /** When OSM returns nothing, keep the existing catalog instead of overwriting. */
  keepOnEmpty?: boolean;
}

function parseOsmArgs(argv: string[]): {
  city?: string;
  force?: boolean;
  gapsOnly?: boolean;
  sparseOnly?: boolean;
  merge?: boolean;
  sparseMax?: number;
} {
  const base = parseArgs(argv);
  let force = false;
  let gapsOnly = false;
  let sparseOnly = false;
  let merge = false;
  let sparseMax = DEFAULT_SPARSE_MAX_COUNT;

  for (const arg of argv) {
    if (arg === '--force') force = true;
    if (arg === '--gaps-only') gapsOnly = true;
    if (arg === '--sparse') sparseOnly = true;
    if (arg === '--merge') merge = true;
    const sparseMatch = arg.match(/^--sparse-max=(\d+)$/);
    if (sparseMatch) sparseMax = Math.max(1, Number(sparseMatch[1]));
  }

  return { city: base.city, force, gapsOnly, sparseOnly, merge, sparseMax };
}

function radiusForPlace(type: string, importance: number): number {
  if (type === 'city' || importance > 0.5) return 22000;
  if (type === 'town' || importance > 0.35) return 18000;
  if (type === 'village') return 14000;
  return 15000;
}

async function geocodeCity(city: AdminCityRef): Promise<GeocodeHit | null> {
  const queries = [
    `${city.name}, ${city.provinceName}, Iran`,
    `${city.name}, Iran`,
  ];

  for (const q of queries) {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'ir');

    const res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) continue;
    const json = (await res.json()) as Array<{
      lat: string;
      lon: string;
      type: string;
      importance: string;
    }>;
    const hit = json[0];
    if (!hit) continue;
    return {
      lat: Number(hit.lat),
      lon: Number(hit.lon),
      type: hit.type,
      importance: Number(hit.importance),
    };
  }
  return null;
}

async function queryOverpass(lat: number, lon: number, radiusM: number): Promise<string[]> {
  const placeTypes =
    'neighbourhood|suburb|quarter|locality|hamlet|village|town';
  const query = `
[out:json][timeout:60];
(
  node["place"~"${placeTypes}"]["name"](around:${radiusM},${lat},${lon});
  node["place"~"${placeTypes}"]["name:fa"](around:${radiusM},${lat},${lon});
  way["place"~"${placeTypes}"]["name"](around:${radiusM},${lat},${lon});
  way["place"~"${placeTypes}"]["name:fa"](around:${radiusM},${lat},${lon});
  relation["boundary"="administrative"]["admin_level"~"8|9|10"]["name"](around:${radiusM},${lat},${lon});
  relation["boundary"="administrative"]["admin_level"~"8|9|10"]["name:fa"](around:${radiusM},${lat},${lon});
  node["landuse"="residential"]["name"](around:${Math.round(radiusM * 0.75)},${lat},${lon});
  node["landuse"="residential"]["name:fa"](around:${Math.round(radiusM * 0.75)},${lat},${lon});
);
out tags;
`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) {
        lastError = new Error(`Overpass HTTP ${res.status}`);
        if (res.status === 429 || res.status === 504 || res.status >= 500) {
          await sleep(3000 * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      const json = (await res.json()) as {
        elements?: Array<{ tags?: Record<string, string> }>;
      };

      const names = new Map<string, string>();
      for (const el of json.elements ?? []) {
        const tags = el.tags ?? {};
        const name = tags['name:fa']?.trim() || tags.name?.trim();
        if (!name || name.length < 2) continue;
        if (/^(Iran|ایران)$/i.test(name)) continue;
        const key = normalizePersianName(name);
        if (!names.has(key)) names.set(key, name);
      }

      return [...names.values()].sort((a, b) => a.localeCompare(b, 'fa'));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await sleep(2000 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Overpass query failed');
}

async function loadExistingCount(cityId: string): Promise<number> {
  const catalog = await loadExistingCatalog(cityId);
  return catalog?.neighborhoods?.length ?? 0;
}

async function loadExistingCatalog(cityId: string): Promise<CityNeighborhoodCatalog | null> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const file = await loadCityCatalogFile(candidate);
    if (file) return file;
  }
  return null;
}

export async function importCityFromOsm(
  city: AdminCityRef,
  opts: OsmImportOptions = {}
): Promise<number> {
  const geo = await geocodeCity(city);
  await sleep(NOMINATIM_DELAY_MS);
  if (!geo) {
    console.warn(`  ! geocode failed for ${city.name}`);
    return 0;
  }

  const radius = radiusForPlace(geo.type, geo.importance);
  const names = await queryOverpass(geo.lat, geo.lon, radius);
  await sleep(OVERPASS_DELAY_MS);

  const incoming = slugifyNeighborhoodNames(
    names.map((name) => ({ name, geoSource: 'osm' as const }))
  );

  if (incoming.length === 0) {
    if (opts.keepOnEmpty) return 0;
  }

  let neighborhoods = incoming;
  const existingFile = await loadExistingCatalog(city.id);

  if (opts.merge && existingFile?.neighborhoods?.length && incoming.length > 0) {
    const merged = mergeCatalogNeighborhoods(existingFile.neighborhoods, incoming);
    neighborhoods = merged.neighborhoods;
  } else if (incoming.length === 0 && existingFile?.neighborhoods?.length) {
    return 0;
  }

  await saveCityCatalog(city.id, {
    cityName: city.name,
    source: 'osm',
    emptyOnDivar: neighborhoods.length === 0,
    neighborhoods,
  });

  return neighborhoods.length;
}

async function ensureFallbackCityNeighborhood(city: AdminCityRef): Promise<boolean> {
  const existing = await loadExistingCount(city.id);
  if (existing > 0) return false;

  const id = makeLocationId(city.name);
  await saveCityCatalog(city.id, {
    cityName: city.name,
    source: 'osm',
    emptyOnDivar: false,
    neighborhoods: [{ id, name: city.name, nameEn: city.id }],
  });
  return true;
}

async function main() {
  const {
    city: onlyCity,
    force,
    gapsOnly,
    sparseOnly,
    merge,
    sparseMax = DEFAULT_SPARSE_MAX_COUNT,
  } = parseOsmArgs(process.argv.slice(2));
  const adminCities = await loadAdminCities();
  const gapManifest = await readManifest();
  const gapIds = new Set([
    ...(gapManifest.emptyOnDivar ?? []),
    ...(gapManifest.unmapped ?? []),
  ]);

  for (const city of adminCities) {
    const count = await loadExistingCount(city.id);
    if (count === 0) gapIds.add(city.id);
  }

  let targets = onlyCity
    ? adminCities.filter((c) => c.id === onlyCity)
    : adminCities;

  if (gapsOnly && !onlyCity) {
    targets = targets.filter((c) => gapIds.has(c.id));
  }

  if (sparseOnly && !onlyCity) {
    const sparseTargets: AdminCityRef[] = [];
    for (const c of targets) {
      const catalog = await loadExistingCatalog(c.id);
      if (isSparseCityCatalog(catalog, c.name, sparseMax)) {
        sparseTargets.push(c);
      }
    }
    targets = sparseTargets;
    console.log(
      `Sparse mode: ${targets.length} cities with ≤${sparseMax} neighborhoods (merge=${!!merge})`
    );
  }

  if (onlyCity && targets.length === 0) {
    console.error(`City "${onlyCity}" not found`);
    process.exit(1);
  }

  let filled = 0;
  let improved = 0;
  let skipped = 0;
  let totalNeighborhoods = 0;

  for (const adminCity of targets) {
    const existingCatalog = await loadExistingCatalog(adminCity.id);
    const existing = existingCatalog?.neighborhoods?.length ?? 0;
    const isGap = gapIds.has(adminCity.id);
    const isSparse = isSparseCityCatalog(existingCatalog, adminCity.name, sparseMax);

    if (!force && !isGap && !isSparse && existing >= MIN_EXISTING_TO_SKIP) {
      skipped += 1;
      continue;
    }

    try {
      const count = await importCityFromOsm(adminCity, {
        merge: merge || sparseOnly,
        keepOnEmpty: sparseOnly || (existing > 0 && !force),
      });
      if (count > existing) {
        improved += 1;
        totalNeighborhoods += count - existing;
        console.log(
          `✓ ${adminCity.name} (${adminCity.id}): ${existing} → ${count} neighborhoods [osm]`
        );
      } else if (count > 0) {
        filled += 1;
        totalNeighborhoods += count;
        console.log(`✓ ${adminCity.name} (${adminCity.id}): ${count} neighborhoods [osm]`);
      } else if (!sparseOnly) {
        const fallback = await ensureFallbackCityNeighborhood(adminCity);
        if (fallback) {
          filled += 1;
          totalNeighborhoods += 1;
          console.log(`✓ ${adminCity.name} (${adminCity.id}): 1 neighborhood [fallback]`);
        } else {
          console.log(`· ${adminCity.name} (${adminCity.id}): 0 neighborhoods [osm]`);
        }
      } else {
        console.log(`· ${adminCity.name} (${adminCity.id}): kept ${existing} [osm empty]`);
      }
    } catch (err) {
      console.error(`✗ ${adminCity.name}:`, err instanceof Error ? err.message : err);
    }
  }

  const manifest = await rebuildManifestFromCatalog();
  console.log('\n---');
  console.log(`OSM filled cities: ${filled}`);
  console.log(`Improved sparse cities: ${improved}`);
  console.log(`Skipped (already had data): ${skipped}`);
  console.log(`Net new neighborhoods: ${totalNeighborhoods}`);
  console.log(`Manifest total: ${manifest.totalNeighborhoods} in ${manifest.citiesWithNeighborhoods} cities`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
