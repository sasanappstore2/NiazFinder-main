/**
 * Import neighborhoods from Divar places API into per-city catalog files.
 *
 * Run:
 *   npm run neighborhoods:import
 *   npm run neighborhoods:import:city -- --city=mashhad
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  CACHE_DIR,
  DIVAR_DISTRICTS_URL,
  REPORTS_DIR,
  NEIGHBORHOODS_ROOT,
  type AdminCityRef,
  type DivarCity,
  type DivarDistrict,
  buildDivarIndexes,
  fetchDivarCities,
  loadAdminCities,
  loadManualMap,
  parseArgs,
  resolveDivarCity,
  sleep,
} from './lib';
import {
  rebuildManifestFromCatalog,
  saveCityCatalog,
  slugifyNeighborhoodNames,
  writeManifest,
} from '../../src/lib/neighborhoods/catalog';
import { adminSlugForCityId } from './lib';

const RATE_LIMIT_MS = 280;

interface CityMapEntry {
  divarCityId: number;
  divarSlug: string;
  matchMethod: string;
}

function streetAreas(district: DivarDistrict): string[] | undefined {
  const areas = (district.tags ?? [])
    .filter((t) => t.type === 'STREET' && t.title?.trim())
    .map((t) => t.title.trim());
  return areas.length ? areas : undefined;
}

async function fetchDistricts(divarCityId: number): Promise<DivarDistrict[]> {
  const res = await fetch(DIVAR_DISTRICTS_URL(divarCityId));
  if (!res.ok) throw new Error(`Districts HTTP ${res.status} for city ${divarCityId}`);
  const json = (await res.json()) as { districts?: DivarDistrict[] };
  return json.districts ?? [];
}

async function importCity(
  adminCity: AdminCityRef,
  divarCity: DivarCity,
  matchMethod: string
): Promise<number> {
  const districts = await fetchDistricts(divarCity.id);
  const seeds = districts.map((d) => ({
    name: d.name.trim(),
    areas: streetAreas(d),
  }));

  const neighborhoods = slugifyNeighborhoodNames(
    seeds.filter((s) => s.name.length > 0)
  );

  await saveCityCatalog(adminCity.id, {
    cityName: adminCity.name,
    source: 'divar',
    emptyOnDivar: neighborhoods.length === 0,
    neighborhoods,
  });

  return neighborhoods.length;
}

async function readCityMap(): Promise<Record<string, CityMapEntry>> {
  const out = path.join(NEIGHBORHOODS_ROOT, 'divar-city-map.json');
  try {
    const raw = await fs.readFile(out, 'utf8');
    return JSON.parse(raw) as Record<string, CityMapEntry>;
  } catch {
    return {};
  }
}

async function writeCityMap(updates: Record<string, CityMapEntry>) {
  const out = path.join(NEIGHBORHOODS_ROOT, 'divar-city-map.json');
  const existing = await readCityMap();
  await fs.writeFile(out, JSON.stringify({ ...existing, ...updates }, null, 2), 'utf8');
}

async function writeUnmappedReport(rows: { id: string; name: string }[]) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const csv = ['adminCityId,adminCityName', ...rows.map((r) => `${r.id},${r.name}`)].join('\n');
  const out = path.join(REPORTS_DIR, 'unmapped-cities.csv');
  await fs.writeFile(out, csv, 'utf8');
  console.log(`Unmapped cities (${rows.length}) → ${out}`);
}

async function main() {
  const { city: onlyCity, refreshCities } = parseArgs(process.argv.slice(2));

  if (refreshCities) {
    const cachePath = path.join(CACHE_DIR, 'divar-cities.json');
    await fs.unlink(cachePath).catch(() => undefined);
  }

  const adminCities = await loadAdminCities();
  const targets = onlyCity
    ? adminCities.filter((c) => c.id === onlyCity || adminSlugForCityId(c.id) === onlyCity)
    : adminCities;

  if (onlyCity && targets.length === 0) {
    console.error(`City "${onlyCity}" not found in admin-locations`);
    process.exit(1);
  }

  const divarCities = await fetchDivarCities();
  const indexes = buildDivarIndexes(divarCities);
  const manual = await loadManualMap();

  const cityMap: Record<string, CityMapEntry> = {};
  const unmapped: { id: string; name: string }[] = [];
  const emptyOnDivar: string[] = [];
  let imported = 0;
  let totalNeighborhoods = 0;

  for (const adminCity of targets) {
    const resolved = resolveDivarCity(adminCity, indexes, manual);
    if (!resolved) {
      unmapped.push({ id: adminCity.id, name: adminCity.name });
      continue;
    }

    const { city: divarCity, method } = resolved;
    cityMap[adminCity.id] = {
      divarCityId: divarCity.id,
      divarSlug: divarCity.slug,
      matchMethod: method,
    };

    try {
      const count = await importCity(adminCity, divarCity, method);
      imported += 1;
      totalNeighborhoods += count;
      if (count === 0) emptyOnDivar.push(adminCity.id);
      console.log(`✓ ${adminCity.name} (${adminCity.id}): ${count} neighborhoods [${method}]`);
    } catch (err) {
      console.error(`✗ ${adminCity.name}:`, err instanceof Error ? err.message : err);
    }

    await sleep(RATE_LIMIT_MS);
  }

  await writeCityMap(cityMap);
  if (!onlyCity) await writeUnmappedReport(unmapped);

  const manifest = await rebuildManifestFromCatalog();
  const allAdmin = await loadAdminCities();
  const fullMap = await readCityMap();
  const mappedIds = new Set(Object.keys(fullMap));
  manifest.emptyOnDivar = onlyCity
    ? manifest.emptyOnDivar
    : [...new Set(emptyOnDivar)];
  manifest.unmapped = allAdmin.filter((c) => !mappedIds.has(c.id)).map((c) => c.id);
  await writeManifest(manifest);

  console.log('\n---');
  console.log(`Imported cities: ${imported}`);
  console.log(`Total neighborhoods: ${totalNeighborhoods}`);
  console.log(`Unmapped: ${unmapped.length}`);
  console.log(`Empty on Divar: ${emptyOnDivar.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
