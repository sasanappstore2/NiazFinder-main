/**
 * Fill empty/unmapped catalogs and rebuild geo for catalog/geo mismatches.
 * Run: npm run geo:fix-gaps
 */
import { execSync } from 'node:child_process';
import { promises as fs } from 'fs';
import path from 'path';
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  readManifest,
  resolveCatalogCityIdCandidates,
} from '../../src/lib/neighborhoods/catalog';
import { loadCityGeoFile } from '../../src/lib/neighborhoods/geo';
import { loadAdminCities } from '../neighborhoods/lib';
import { ROOT } from './shared';
import { buildCity } from '../neighborhoods/build-synthetic-geo';

function run(cmd: string): void {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: process.env });
}

async function catalogCount(adminCityId: string): Promise<number> {
  for (const candidate of resolveCatalogCityIdCandidates(adminCityId)) {
    const file = await loadCityCatalogFile(candidate);
    if (file) return file.neighborhoods?.length ?? 0;
  }
  return 0;
}

async function geoGapCities(): Promise<string[]> {
  const manifest = await readManifest();
  const emptySet = new Set(manifest.emptyOnDivar ?? []);
  const unmappedSet = new Set(manifest.unmapped ?? []);
  const admin = await loadAdminCities();
  const gaps: string[] = [];

  for (const city of admin) {
    const count = await catalogCount(city.id);
    if (count === 0 || emptySet.has(city.id) || unmappedSet.has(city.id)) {
      gaps.push(city.id);
    }
  }

  const catalogIds = await listCatalogCityIds();
  for (const catalogCityId of catalogIds) {
    const catalog = await loadCityCatalogFile(catalogCityId);
    const geo = await loadCityGeoFile(catalogCityId);
    const catalogN = catalog?.neighborhoods?.length ?? 0;
    const geoN = geo?.features?.length ?? 0;
    if (catalogN > 0 && geoN < catalogN && !gaps.includes(catalogCityId)) {
      gaps.push(catalogCityId);
    }
  }

  return [...new Set(gaps)];
}

async function main(): Promise<void> {
  const skipNetwork = process.env.GEO_SKIP_NETWORK === '1';

  if (!skipNetwork) {
    run('npx --yes tsx scripts/neighborhoods/ensure-national-fallback.ts');
    try {
      run('npx --yes tsx scripts/neighborhoods/import-from-osm.ts --gaps-only');
    } catch {
      console.warn('OSM gaps import failed — continuing with fallbacks');
    }
  } else {
    run('npx --yes tsx scripts/neighborhoods/ensure-national-fallback.ts');
  }

  const gaps = await geoGapCities();
  console.log(`\nCities needing geo rebuild: ${gaps.length}`);

  for (const cityId of gaps) {
    if (!skipNetwork) {
      try {
        run(`npx --yes tsx scripts/neighborhoods/import-geo-from-osm.ts --city=${cityId}`);
      } catch {
        /* synthetic next */
      }
    }
    await buildCity(cityId);
    run(`npx --yes tsx scripts/geo/build-location-viewports.ts --city=${cityId}`);
  }

  run('npx --yes tsx scripts/neighborhoods/fix-manifest.ts');

  const reportPath = path.join(ROOT, 'reports/geo-gap-fix.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(
    reportPath,
    JSON.stringify({ fixedAt: new Date().toISOString(), cities: gaps }, null, 2) + '\n',
    'utf8'
  );
  console.log(`\nGap fix report → ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
