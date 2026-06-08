/**
 * Deep debug: neighborhood catalogs, geo polygons, map config, API resolution.
 * Run: npx tsx scripts/neighborhoods/debug-map-integration.ts
 */
import { promises as fs } from 'fs';
import path from 'path';
import { loadAdminCities, REPORTS_DIR } from './lib';
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  loadCityNeighborhoods,
  resolveCatalogCityIdCandidates,
} from '../../src/lib/neighborhoods/catalog';
import { loadCityGeoFile, loadNeighborhoodGeoFeatures, readGeoManifest } from '../../src/lib/neighborhoods/geo';
import { sanitizeAreaLabels } from '../../src/lib/neighborhoods/area-labels';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import { buildNeighborhoodBoundariesFeatureCollection } from '../../src/lib/map/iran/neighborhood-boundaries';

type Issue = { severity: 'error' | 'warning'; code: string; message: string };

const issues: Issue[] = [];
const MAP_CONFIG_PATH = path.join(process.cwd(), 'src/data/geo/iran-cities-map-config.json');

function add(severity: Issue['severity'], code: string, message: string) {
  issues.push({ severity, code, message });
}

async function main(): Promise<void> {
  const adminCities = await loadAdminCities();
  const catalogIds = new Set(await listCatalogCityIds());
  const geoManifest = await readGeoManifest();
  const mapConfig = JSON.parse(await fs.readFile(MAP_CONFIG_PATH, 'utf8')) as {
    cities: Record<string, { slug: string; lat: number; lng: number }>;
  };

  let catalogHoods = 0;
  let geoFeatures = 0;
  let citiesWithGeo = 0;
  let citiesMissingMapConfig = 0;

  for (const cityId of catalogIds) {
    const catalog = await loadCityCatalogFile(cityId);
    if (!catalog?.neighborhoods?.length) continue;

    catalogHoods += catalog.neighborhoods.length;
    const slug = locationCityIdToSlug(cityId);
    if (!mapConfig.cities[slug]) {
      citiesMissingMapConfig += 1;
      add('error', 'map_config_missing', `${cityId} (slug ${slug}): no iran-cities-map-config entry`);
    }

    const geo = await loadCityGeoFile(cityId);
    if (!geo?.features?.length) {
      add('error', 'geo_missing', `${cityId}: catalog has ${catalog.neighborhoods.length} hoods but no geo file`);
      continue;
    }

    citiesWithGeo += 1;
    geoFeatures += geo.features.length;

    if (geo.features.length !== catalog.neighborhoods.length) {
      add(
        'error',
        'geo_count_mismatch',
        `${cityId}: catalog ${catalog.neighborhoods.length} vs geo ${geo.features.length}`
      );
    }

    const geoIds = new Set(geo.features.map((f) => f.properties.id));
    for (const n of catalog.neighborhoods) {
      if (!geoIds.has(n.id)) {
        add('error', 'geo_hood_missing', `${cityId}/${n.id}: polygon missing`);
      }
      const rawAreas = n.areas ?? [];
      const sanitized = sanitizeAreaLabels(rawAreas, n.name);
      if (sanitized.length !== rawAreas.length) {
        add('warning', 'areas_need_sanitize', `${cityId}/${n.id}: ${rawAreas.length} -> ${sanitized.length} areas after sanitize`);
      }
      for (const a of rawAreas) {
        if (/\?{2,}/.test(a)) {
          add('error', 'corrupted_area', `${cityId}/${n.id}: "${a.slice(0, 40)}"`);
        }
      }
      if ((n.areas?.length ?? 0) < 3) {
        add('error', 'areas_too_few', `${cityId}/${n.id}: ${n.areas?.length ?? 0} areas`);
      }
    }
  }

  for (const city of adminCities) {
    const slug = locationCityIdToSlug(city.id);
    const hasCatalog = [...resolveCatalogCityIdCandidates(city.id)].some((c) => catalogIds.has(c));
    if (!hasCatalog) continue;

    const loaded = await loadCityNeighborhoods(city.id);
    const fileLoaded = await loadCityNeighborhoods(slug);
    if (loaded.length !== fileLoaded.length) {
      add(
        'error',
        'api_resolution_mismatch',
        `${city.id}: loadCityNeighborhoods(${city.id})=${loaded.length} vs slug(${slug})=${fileLoaded.length}`
      );
    }
  }

  const sampleCities = ['mashhad', 'tehran', 'karaj', 'shiraz', 'isfahan', 'tabriz', 'ahvaz'];
  for (const slug of sampleCities) {
    const catalog = await loadCityCatalogFile(slug) ?? await loadCityCatalogFile(`${slug}-city`);
    if (!catalog?.neighborhoods?.length) {
      add('warning', 'sample_missing', `sample city ${slug}: no catalog`);
      continue;
    }
    const hood = catalog.neighborhoods[0]!;
    const features = await loadNeighborhoodGeoFeatures(slug, [hood.id]);
    if (!features.length) {
      add('error', 'api_geo_sample', `${slug}/${hood.id}: loadNeighborhoodGeoFeatures returned 0`);
      continue;
    }
    const collection = buildNeighborhoodBoundariesFeatureCollection({
      features,
      neighborhoodSlugs: [hood.id],
    });
    if (!collection.features[0]?.properties.selected) {
      add('error', 'map_selection', `${slug}/${hood.id}: selected flag false in boundary collection`);
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      adminCities: adminCities.length,
      catalogCities: catalogIds.size,
      citiesWithGeo,
      catalogNeighborhoods: catalogHoods,
      geoFeatures,
      geoManifestTotal: geoManifest.totalFeatures,
      citiesMissingMapConfig,
      errors: errors.length,
      warnings: warnings.length,
    },
    issues,
  };

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const out = path.join(REPORTS_DIR, 'map-neighborhood-debug.json');
  await fs.writeFile(out, JSON.stringify(report, null, 2), 'utf8');

  console.log('Map + neighborhood debug report ->', out);
  console.log('Summary:', report.summary);

  if (errors.length) {
    console.error('\nErrors:');
    for (const e of errors.slice(0, 40)) console.error(`  [${e.code}] ${e.message}`);
    if (errors.length > 40) console.error(`  ... and ${errors.length - 40} more`);
    process.exit(1);
  }

  console.log('\nDeep debug passed (warnings:', warnings.length, ')');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
