/**
 * Fill neighborhood catalogs from OpenStreetMap for cities missing Divar data.
 *
 * Run:
 *   npm run neighborhoods:import:osm
 *   npm run neighborhoods:import:osm -- --city=tabriz
 *   npm run neighborhoods:import:osm -- --force
 */
import {
  loadAdminCities,
  normalizePersianName,
  parseArgs,
  sleep,
  type AdminCityRef,
} from './lib';
import {
  loadCityCatalogFile,
  readManifest,
  resolveCatalogCityIdCandidates,
  saveCityCatalog,
  slugifyNeighborhoodNames,
  rebuildManifestFromCatalog,
} from '../../src/lib/neighborhoods/catalog';
import { makeLocationId } from '../../src/lib/admin-locations';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'NiazFinder-NeighborhoodImport/1.0 (contact@needfinder.ir)';
const NOMINATIM_DELAY_MS = 1100;
const OVERPASS_DELAY_MS = 400;
const MIN_EXISTING_TO_SKIP = 5;

interface GeocodeHit {
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

function parseOsmArgs(argv: string[]): {
  city?: string;
  force?: boolean;
  gapsOnly?: boolean;
} {
  const base = parseArgs(argv);
  let force = false;
  let gapsOnly = false;
  for (const arg of argv) {
    if (arg === '--force') force = true;
    if (arg === '--gaps-only') gapsOnly = true;
  }
  return { city: base.city, force, gapsOnly };
}

function radiusForPlace(type: string, importance: number): number {
  if (type === 'city' || importance > 0.5) return 22000;
  if (type === 'town' || importance > 0.35) return 15000;
  if (type === 'village') return 8000;
  return 12000;
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
  const query = `
[out:json][timeout:45];
(
  node["place"~"neighbourhood|suburb|quarter|locality"]["name"](around:${radiusM},${lat},${lon});
  node["place"~"neighbourhood|suburb|quarter|locality"]["name:fa"](around:${radiusM},${lat},${lon});
  way["place"~"neighbourhood|suburb|quarter|locality"]["name"](around:${radiusM},${lat},${lon});
  way["place"~"neighbourhood|suburb|quarter|locality"]["name:fa"](around:${radiusM},${lat},${lon});
  relation["boundary"="administrative"]["admin_level"~"9|10"]["name"](around:${radiusM},${lat},${lon});
  relation["boundary"="administrative"]["admin_level"~"9|10"]["name:fa"](around:${radiusM},${lat},${lon});
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
        if (res.status >= 500) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      const json = (await res.json()) as {
        elements?: Array<{ tags?: Record<string, string> }>;
      };

      const names = new Set<string>();
      for (const el of json.elements ?? []) {
        const tags = el.tags ?? {};
        const name = tags['name:fa']?.trim() || tags.name?.trim();
        if (!name || name.length < 2) continue;
        if (/^(Iran|ایران)$/i.test(name)) continue;
        names.add(normalizePersianName(name));
      }

      return [...names].sort((a, b) => a.localeCompare(b, 'fa'));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await sleep(2000 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Overpass query failed');
}

async function loadExistingCount(cityId: string): Promise<number> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const file = await loadCityCatalogFile(candidate);
    if (file?.neighborhoods?.length) return file.neighborhoods.length;
  }
  return 0;
}

export async function importCityFromOsm(city: AdminCityRef): Promise<number> {
  const geo = await geocodeCity(city);
  await sleep(NOMINATIM_DELAY_MS);
  if (!geo) {
    console.warn(`  ! geocode failed for ${city.name}`);
    return 0;
  }

  const radius = radiusForPlace(geo.type, geo.importance);
  const names = await queryOverpass(geo.lat, geo.lon, radius);
  await sleep(OVERPASS_DELAY_MS);

  const neighborhoods = slugifyNeighborhoodNames(names.map((name) => ({ name })));

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
  const { city: onlyCity, force, gapsOnly } = parseOsmArgs(process.argv.slice(2));
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

  if (onlyCity && targets.length === 0) {
    console.error(`City "${onlyCity}" not found`);
    process.exit(1);
  }

  let filled = 0;
  let skipped = 0;
  let totalNeighborhoods = 0;

  for (const adminCity of targets) {
    const existing = await loadExistingCount(adminCity.id);
    const isGap = gapIds.has(adminCity.id);
    if (!force && !isGap && existing >= MIN_EXISTING_TO_SKIP) {
      skipped += 1;
      continue;
    }

    try {
      const count = await importCityFromOsm(adminCity);
      if (count > 0) {
        filled += 1;
        totalNeighborhoods += count;
        console.log(`✓ ${adminCity.name} (${adminCity.id}): ${count} neighborhoods [osm]`);
      } else {
        const fallback = await ensureFallbackCityNeighborhood(adminCity);
        if (fallback) {
          filled += 1;
          totalNeighborhoods += 1;
          console.log(`✓ ${adminCity.name} (${adminCity.id}): 1 neighborhood [fallback]`);
        } else {
          console.log(`· ${adminCity.name} (${adminCity.id}): 0 neighborhoods [osm]`);
        }
      }
    } catch (err) {
      console.error(`✗ ${adminCity.name}:`, err instanceof Error ? err.message : err);
    }
  }

  const manifest = await rebuildManifestFromCatalog();
  console.log('\n---');
  console.log(`OSM filled cities: ${filled}`);
  console.log(`Skipped (already had data): ${skipped}`);
  console.log(`New neighborhoods: ${totalNeighborhoods}`);
  console.log(`Manifest total: ${manifest.totalNeighborhoods} in ${manifest.citiesWithNeighborhoods} cities`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
