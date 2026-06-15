/**
 * Phase 1 ? fetch Divar places API and build provisional province tree.
 * Run: npx tsx scripts/divar/extract-divar-city-tree.ts [--refresh]
 */
import { promises as fs } from 'fs';
import path from 'path';
import { DIVAR_CITIES_URL } from '../neighborhoods/lib';
import {
  buildApiTree,
  type DivarApiCity,
} from './lib/build-city-tree';

const DATA_DIR = path.join(process.cwd(), 'data', 'divar');
const CACHE_PATH = path.join(DATA_DIR, '.cache', 'divar-api-cities-raw.json');
const OUT_PATH = path.join(DATA_DIR, '.cache', 'divar-api-tree.json');

async function fetchRawCities(refresh: boolean): Promise<DivarApiCity[]> {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });

  if (!refresh) {
    try {
      const cached = await fs.readFile(CACHE_PATH, 'utf8');
      const parsed = JSON.parse(cached) as { cities: DivarApiCity[] };
      if (parsed.cities?.length) return parsed.cities;
    } catch {
      /* fetch */
    }
  }

  const res = await fetch(DIVAR_CITIES_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Divar cities HTTP ${res.status}`);
  const json = (await res.json()) as { cities: DivarApiCity[] };
  await fs.writeFile(CACHE_PATH, JSON.stringify(json, null, 2), 'utf8');
  return json.cities;
}

async function main(): Promise<void> {
  const refresh = process.argv.includes('--refresh');
  const cities = await fetchRawCities(refresh);
  const tree = buildApiTree(cities);

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(tree, null, 2), 'utf8');

  console.log(
    JSON.stringify({
      ok: true,
      apiCityCount: cities.length,
      provinceCount: tree.provinces.length,
      out: OUT_PATH,
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
