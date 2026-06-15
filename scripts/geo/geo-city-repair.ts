/**
 * Repair geo pipeline for a single admin city (catalog → polygons → viewport).
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
} from '../../src/lib/neighborhoods/catalog';
import { loadCityGeoFile } from '../../src/lib/neighborhoods/geo';
import { makeLocationId } from '../../src/lib/admin-locations';
import { saveCityCatalog } from '../../src/lib/neighborhoods/catalog';
import { loadAdminCities, adminSlugForCityId } from '../neighborhoods/lib';
import { cityBboxFromConfig } from '../neighborhoods/geo-lib';
import { ROOT } from './shared';

function run(cmd: string): void {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: process.env });
}

async function catalogCount(cityId: string): Promise<number> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const file = await loadCityCatalogFile(candidate);
    if (file) return file.neighborhoods?.length ?? 0;
  }
  return 0;
}

async function geoFeatureCount(cityId: string): Promise<number> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const geo = await loadCityGeoFile(candidate);
    if (geo?.features?.length) return geo.features.length;
  }
  return 0;
}

async function ensureFallbackCatalog(cityId: string): Promise<boolean> {
  const count = await catalogCount(cityId);
  if (count > 0) return false;

  const admin = (await loadAdminCities()).find((c) => c.id === cityId);
  if (!admin) throw new Error(`Unknown city ${cityId}`);

  const id = makeLocationId(admin.name);
  const slug = adminSlugForCityId(cityId);
  const cityBbox = cityBboxFromConfig(slug);
  const centroid = cityBbox
    ? {
        lat: (cityBbox.south + cityBbox.north) / 2,
        lng: (cityBbox.west + cityBbox.east) / 2,
      }
    : undefined;

  await saveCityCatalog(cityId, {
    cityName: admin.name,
    source: 'osm',
    emptyOnDivar: true,
    neighborhoods: [
      {
        id,
        name: admin.name,
        nameEn: cityId,
        ...(centroid ? { centroid } : {}),
        ...(cityBbox ? { bbox: cityBbox } : {}),
        ...(cityBbox ? { geoSource: 'synthetic' as const } : {}),
      },
    ],
  });
  console.log(`fallback catalog created for ${cityId}`);
  return true;
}

export interface CityRepairResult {
  cityId: string;
  actions: string[];
}

/** Run minimal repair steps for one city. */
export async function repairCityGeo(cityId: string, opts?: { skipNetwork?: boolean }): Promise<CityRepairResult> {
  const actions: string[] = [];
  let count = await catalogCount(cityId);

  if (count === 0 && !opts?.skipNetwork) {
    try {
      run(`npx --yes tsx scripts/neighborhoods/import-from-divar.ts --city=${cityId}`);
      actions.push('import-divar');
      count = await catalogCount(cityId);
    } catch {
      /* try osm next */
    }
  }

  if (count === 0 && !opts?.skipNetwork) {
    try {
      run(`npx --yes tsx scripts/neighborhoods/import-from-osm.ts --city=${cityId}`);
      actions.push('import-osm');
      count = await catalogCount(cityId);
    } catch {
      /* fallback */
    }
  }

  if (count === 0) {
    await ensureFallbackCatalog(cityId);
    actions.push('fallback-catalog');
    count = await catalogCount(cityId);
  }

  const geoCount = await geoFeatureCount(cityId);
  if (geoCount < count) {
    if (!opts?.skipNetwork) {
      try {
        run(`npx --yes tsx scripts/neighborhoods/import-geo-from-osm.ts --city=${cityId}`);
        actions.push('import-geo-osm');
      } catch {
        /* synthetic fallback */
      }
    }
    run(`npx --yes tsx scripts/neighborhoods/build-synthetic-geo.ts --city=${cityId}`);
    actions.push('build-synthetic-geo');
  }

  run(`npx --yes tsx scripts/geo/build-location-viewports.ts --city=${cityId}`);
  actions.push('build-viewports');

  return { cityId, actions };
}

export async function repairProvinceGeo(
  provinceId: string,
  opts?: { skipNetwork?: boolean }
): Promise<CityRepairResult[]> {
  const admin = await loadAdminCities();
  const cities = admin.filter((c) => c.provinceId === provinceId);
  const results: CityRepairResult[] = [];
  for (const city of cities) {
    console.log(`\n=== Repair ${city.name} (${city.id}) ===`);
    results.push(await repairCityGeo(city.id, opts));
  }
  return results;
}
