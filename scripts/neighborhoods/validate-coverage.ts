/**
 * Validate neighborhood catalog coverage for all admin cities.
 * Run: npm run neighborhoods:validate
 */
import { promises as fs } from 'fs';
import path from 'path';
import { loadAdminCities, REPORTS_DIR } from './lib';
import {
  loadCityCatalogFile,
  readManifest,
  resolveCatalogCityIdCandidates,
} from '../../src/lib/neighborhoods/catalog';

async function loadCatalogForAdminCity(cityId: string) {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const catalog = await loadCityCatalogFile(candidate);
    if (catalog) return catalog;
  }
  return null;
}

const CATALOG_DIR = path.join(process.cwd(), 'src', 'data', 'neighborhoods', 'catalog');

interface CityReport {
  cityId: string;
  name: string;
  count: number;
  status: 'ok' | 'missing' | 'empty' | 'unmapped';
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
  const unmappedSet = new Set(manifest.unmapped ?? []);
  const emptySet = new Set(manifest.emptyOnDivar ?? []);
  const mappedSet = new Set(Object.keys(cityMap));

  const reports: CityReport[] = [];
  const errors: string[] = [];

  for (const city of adminCities) {
    if (unmappedSet.has(city.id)) {
      reports.push({ cityId: city.id, name: city.name, count: 0, status: 'unmapped' });
      continue;
    }

    const catalog = await loadCatalogForAdminCity(city.id);
    const count = catalog?.neighborhoods?.length ?? 0;

    if (!catalog) {
      const status: CityReport['status'] = mappedSet.has(city.id) ? 'missing' : 'unmapped';
      reports.push({ cityId: city.id, name: city.name, count: 0, status });
      if (status === 'missing') {
        errors.push(`Missing catalog file for mapped city ${city.id} (${city.name})`);
      }
      continue;
    }

    if (count === 0 || emptySet.has(city.id)) {
      reports.push({ cityId: city.id, name: city.name, count: 0, status: 'empty' });
      continue;
    }

    const ids = new Set<string>();
    for (const n of catalog.neighborhoods) {
      if (!n.name?.trim()) errors.push(`${city.id}: empty neighborhood name`);
      if (ids.has(n.id)) errors.push(`${city.id}: duplicate id ${n.id}`);
      ids.add(n.id);
    }

    reports.push({ cityId: city.id, name: city.name, count, status: 'ok' });
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
  console.log('Summary:', {
    ok: reports.filter((r) => r.status === 'ok').length,
    missing: reports.filter((r) => r.status === 'missing').length,
    empty: reports.filter((r) => r.status === 'empty').length,
    unmapped: reports.filter((r) => r.status === 'unmapped').length,
  });

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
