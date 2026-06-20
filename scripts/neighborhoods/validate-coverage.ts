/**
 * Validate neighborhood catalog coverage for all admin cities.
 * Run: npm run neighborhoods:validate
 */
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { loadAdminCities, REPORTS_DIR } from './lib';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import {
  loadCityCatalogFile,
  readManifest,
  resolveCatalogCityIdCandidates,
} from '../../src/lib/neighborhoods/catalog';
import { loadCityGeoFile } from '../../src/lib/neighborhoods/geo';
import {
  displayAreaLabels,
  isSyntheticAreaLabel,
} from '../../src/lib/neighborhoods/area-labels';
import {
  DEFAULT_SPARSE_MAX_COUNT,
  isSparseCityCatalog,
} from './sparse-city';

async function loadCatalogForAdminCity(cityId: string) {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const catalog = await loadCityCatalogFile(candidate);
    if (catalog) return catalog;
  }
  return null;
}

async function loadAllNeighborhoodsForAdminCity(cityId: string) {
  const ids = new Set(resolveCatalogCityIdCandidates(cityId));
  const slug = locationCityIdToSlug(cityId);
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), 'src/data/neighborhoods/divar-city-map.json'),
      'utf8'
    );
    const divarMap = JSON.parse(raw) as Record<string, { divarSlug?: string }>;
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
    const file = await loadCityCatalogFile(candidate);
    if (!file?.neighborhoods?.length) continue;
    for (const n of file.neighborhoods) {
      if (!byId.has(n.id)) byId.set(n.id, n);
    }
  }
  return [...byId.values()];
}

const CATALOG_DIR = path.join(process.cwd(), 'src', 'data', 'neighborhoods', 'catalog');
const VIEWPORT_CHUNKS_DIR = path.join(process.cwd(), 'src', 'data', 'geo', 'viewports', 'cities');

interface CityReport {
  cityId: string;
  name: string;
  count: number;
  status: 'ok' | 'missing' | 'empty' | 'unmapped' | 'sparse';
}

async function loadCityMap(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), 'src/data/neighborhoods/divar-city-map.json'),
      'utf8'
    );
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function main() {
  const adminCities = await loadAdminCities();
  const manifest = await readManifest();
  const cityMap = await loadCityMap();
  const mappedSet = new Set(Object.keys(cityMap));

  const reports: CityReport[] = [];
  const errors: string[] = [];

  for (const city of adminCities) {
    const catalog = await loadCatalogForAdminCity(city.id);
    const count = catalog?.neighborhoods?.length ?? 0;

    if (!catalog || count === 0) {
      const status: CityReport['status'] = !catalog
        ? mappedSet.has(city.id)
          ? 'missing'
          : 'unmapped'
        : 'empty';
      reports.push({ cityId: city.id, name: city.name, count: 0, status });
      if (status === 'missing') {
        errors.push(`Missing catalog file for mapped city ${city.id} (${city.name})`);
      }
      continue;
    }

    const ids = new Set<string>();
    let catalogCityId = city.id;
    for (const candidate of resolveCatalogCityIdCandidates(city.id)) {
      const file = await loadCityCatalogFile(candidate);
      if (file) {
        catalogCityId = candidate;
        break;
      }
    }
    const geo = await loadCityGeoFile(catalogCityId);
    const geoIds = new Set((geo?.features ?? []).map((f) => f.properties.id));

    for (const n of catalog.neighborhoods) {
      if (!n.name?.trim()) errors.push(`${city.id}: empty neighborhood name`);
      if (ids.has(n.id)) errors.push(`${city.id}: duplicate id ${n.id}`);
      ids.add(n.id);
      const displayAreas = displayAreaLabels(n.areas, n.name);
      const hasGeo = Boolean(n.bbox || n.centroid);
      if (displayAreas.length === 0 && !hasGeo) {
        errors.push(`${city.id}/${n.id}: expected real areas or geo centroid/bbox`);
      }
      for (const area of n.areas ?? []) {
        if (/\?{2,}/.test(area)) {
          errors.push(`${city.id}/${n.id}: corrupted area label "${area.slice(0, 40)}"`);
        }
        if (isSyntheticAreaLabel(area, n.name)) {
          errors.push(`${city.id}/${n.id}: synthetic area label "${area}" should be stripped`);
        }
      }
      if (!geoIds.has(n.id)) {
        errors.push(`${city.id}/${n.id}: missing geo polygon`);
      }
    }

    const chunkPath = path.join(VIEWPORT_CHUNKS_DIR, `${city.id}.json`);
    if (!existsSync(chunkPath)) {
      errors.push(`${city.id}: missing viewport chunk (run npm run geo:build-viewports)`);
    } else {
      try {
        const chunk = JSON.parse(await fs.readFile(chunkPath, 'utf8')) as {
          n?: Record<string, { c?: number[]; b?: number[] }>;
        };
        const allNeighborhoods = await loadAllNeighborhoodsForAdminCity(city.id);
        for (const n of allNeighborhoods) {
          const entry = chunk.n?.[n.id];
          if (!entry?.b || entry.b.length !== 4) {
            errors.push(`${city.id}/${n.id}: missing viewport bbox in chunk`);
          }
        }
      } catch {
        errors.push(`${city.id}: invalid viewport chunk JSON`);
      }
    }

    const sparse = isSparseCityCatalog(catalog, city.name, DEFAULT_SPARSE_MAX_COUNT);
    reports.push({
      cityId: city.id,
      name: city.name,
      count,
      status: sparse ? 'sparse' : 'ok',
    });
  }

  const mashhad = await loadCityCatalogFile('mashhad');
  if (!mashhad || mashhad.neighborhoods.length < 250) {
    errors.push(`Mashhad: expected >= 250 neighborhoods, got ${mashhad?.neighborhoods.length ?? 0}`);
  }
  const azad = mashhad?.neighborhoods.find((n) => n.name.includes('آزادشهر'));
  if (!azad) {
    errors.push('Mashhad: missing آزادشهر neighborhood');
  } else {
    const areas = azad.areas ?? [];
    if (!areas.some((a) => a.includes('مدرس'))) {
      errors.push('Mashhad آزادشهر: missing مدرس in areas');
    }
    if (!areas.some((a) => a.includes('وکیل آباد'))) {
      errors.push('Mashhad آزادشهر: missing وکیل آباد in areas');
    }
  }

  const tehran = await loadCatalogForAdminCity('tehran-city');
  if (tehran && tehran.neighborhoods.length > 0 && tehran.neighborhoods.length < 350) {
    errors.push(
      `Tehran: expected >= 350 neighborhoods when present, got ${tehran.neighborhoods.length}`
    );
  }

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, 'neighborhood-coverage.json');
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          totalCities: adminCities.length,
          ok: reports.filter((r) => r.status === 'ok').length,
          sparse: reports.filter((r) => r.status === 'sparse').length,
          missing: reports.filter((r) => r.status === 'missing').length,
          empty: reports.filter((r) => r.status === 'empty').length,
          unmapped: reports.filter((r) => r.status === 'unmapped').length,
        },
        cities: reports,
        errors,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Report → ${reportPath}`);
  const sparseCount = reports.filter((r) => r.status === 'sparse').length;
  console.log('Summary:', {
    ok: reports.filter((r) => r.status === 'ok').length,
    sparse: sparseCount,
    missing: reports.filter((r) => r.status === 'missing').length,
    empty: reports.filter((r) => r.status === 'empty').length,
    unmapped: reports.filter((r) => r.status === 'unmapped').length,
  });
  if (sparseCount > 0) {
    console.warn(
      `\n${sparseCount} cities still sparse (≤${DEFAULT_SPARSE_MAX_COUNT} neighborhoods). Run: npm run neighborhoods:import:sparse`
    );
  }

  if (errors.length) {
    console.error('\nValidation errors:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('\nValidation passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
