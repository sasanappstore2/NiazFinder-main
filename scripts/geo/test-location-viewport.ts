/**
 * Validate location viewport index + per-city chunks cover all admin cities and neighborhoods.
 * Run: npm run test:location-viewport
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
} from '../../src/lib/neighborhoods/catalog';
import type { CityViewportChunk, LocationViewportsIndex } from '../../src/lib/map/location-viewport-types';
import { loadAdminCities } from '../neighborhoods/lib';
import { GEO_DIR, readJson } from './shared';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';

const INDEX_PATH = path.join(GEO_DIR, 'iran-location-viewports-index.json');
const CHUNKS_DIR = path.join(GEO_DIR, 'viewports', 'cities');

function isValidBbox(b: [number, number, number, number]): boolean {
  const [west, south, east, north] = b;
  return (
    Number.isFinite(west) &&
    Number.isFinite(south) &&
    Number.isFinite(east) &&
    Number.isFinite(north) &&
    south < north &&
    west < east &&
    south >= 24 &&
    north <= 40 &&
    west >= 43 &&
    east <= 65
  );
}

function isValidCenter(c: [number, number, number]): boolean {
  return Number.isFinite(c[0]) && Number.isFinite(c[1]) && Number.isFinite(c[2]) && c[2] >= 4 && c[2] <= 18;
}

async function resolveAllNeighborhoodsForCity(cityId: string) {
  const ids = new Set(resolveCatalogCityIdCandidates(cityId));
  try {
    const divarMap = readJson<{ [key: string]: { divarSlug?: string } }>(
      path.join(process.cwd(), 'src/data/neighborhoods/divar-city-map.json')
    );
    const slug = locationCityIdToSlug(cityId);
    for (const [catalogCityId, meta] of Object.entries(divarMap)) {
      if (
        meta.divarSlug === slug ||
        catalogCityId === cityId ||
        catalogCityId === slug ||
        catalogCityId.replace(/^alborz-/, '') === slug
      ) {
        ids.add(catalogCityId);
      }
    }
  } catch {
    /* optional */
  }

  const byId = new Map<string, { id: string }>();
  for (const candidate of ids) {
    const catalog = await loadCityCatalogFile(candidate);
    if (!catalog?.neighborhoods?.length) continue;
    for (const n of catalog.neighborhoods) {
      if (!byId.has(n.id)) byId.set(n.id, n);
    }
  }
  return [...byId.values()];
}

async function main() {
  const errors: string[] = [];

  if (!fs.existsSync(INDEX_PATH)) {
    console.error('Missing viewport index. Run: npm run geo:build-viewports');
    process.exit(1);
  }

  const index = readJson<LocationViewportsIndex>(INDEX_PATH);
  const adminCities = await loadAdminCities();

  if (Object.keys(index.provinces).length < 31) {
    errors.push(`Expected 31 provinces in index, got ${Object.keys(index.provinces).length}`);
  }

  for (const city of adminCities) {
    if (!index.cities[city.id]) {
      errors.push(`Missing city index entry: ${city.id} (${city.name})`);
    }

    const chunkPath = path.join(CHUNKS_DIR, `${city.id}.json`);
    if (!fs.existsSync(chunkPath)) {
      errors.push(`Missing city chunk: ${city.id}`);
      continue;
    }

    const chunk = readJson<CityViewportChunk>(chunkPath);
    if (!isValidCenter(chunk.c)) errors.push(`${city.id}: invalid city center`);
    if (!isValidBbox(chunk.b)) errors.push(`${city.id}: invalid city bbox`);

    const neighborhoods = await resolveAllNeighborhoodsForCity(city.id);
    for (const n of neighborhoods) {
      const entry = chunk.n[n.id];
      if (!entry) {
        errors.push(`${city.id}/${n.id}: missing neighborhood in chunk`);
        continue;
      }
      if (!isValidBbox(entry.b)) errors.push(`${city.id}/${n.id}: invalid neighborhood bbox`);
      const [west, south, east, north] = entry.b;
      const [lat, lng] = entry.c;
      if (lat < south || lat > north || lng < west || lng > east) {
        errors.push(`${city.id}/${n.id}: neighborhood center outside its bbox`);
      }
    }
  }

  const mashhad = readJson<CityViewportChunk>(path.join(CHUNKS_DIR, 'mashhad.json'));
  const mashhadCatalog = await loadCityCatalogFile('mashhad');
  const sajad = mashhadCatalog?.neighborhoods.find((n) => n.name.includes('????'));
  if (sajad && !mashhad.n[sajad.id]) {
    errors.push('mashhad: missing ???? neighborhood viewport');
  }

  const tehranChunk = readJson<CityViewportChunk>(path.join(CHUNKS_DIR, 'tehran-city.json'));
  if (!isValidCenter(tehranChunk.c)) errors.push('tehran-city: invalid center');

  const inche = readJson<CityViewportChunk>(path.join(CHUNKS_DIR, 'inche-borun.json'));
  if (!isValidCenter(inche.c)) errors.push('inche-borun: invalid center');

  if (errors.length) {
    console.error(`\n${errors.length} viewport errors:`);
    for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
    if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`);
    process.exit(1);
  }

  console.log('Location viewport tests passed.');
  console.log({
    provinces: Object.keys(index.provinces).length,
    cities: adminCities.length,
    chunks: fs.readdirSync(CHUNKS_DIR).length,
    generatedAt: index.generatedAt,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
