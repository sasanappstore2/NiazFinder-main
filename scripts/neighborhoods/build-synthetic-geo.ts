/**
 * Build synthetic neighborhood polygons for all catalog cities.
 * Run: npx tsx scripts/neighborhoods/build-synthetic-geo.ts
 */
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  saveCityCatalog,
} from '../../src/lib/neighborhoods/catalog';
import {
  centroidFromBbox,
  saveCityGeoFile,
  syncCatalogGeoFields,
  writeGeoManifest,
} from '../../src/lib/neighborhoods/geo';
import type { CityNeighborhoodGeoCollection } from '../../src/lib/neighborhoods/geo-types';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';
import {
  cityBboxFromConfig,
  ensureGeoDirs,
  makeGeoFeature,
  polygonFromCatalogNeighborhood,
} from './geo-lib';

const EMPTY_STATS = { divar: 0, osm: 0, synthetic: 0 };

async function buildCity(cityId: string): Promise<{ count: number; stats: typeof EMPTY_STATS }> {
  const catalog = await loadCityCatalogFile(cityId);
  if (!catalog?.neighborhoods?.length) return { count: 0, stats: EMPTY_STATS };

  const citySlug = locationCityIdToSlug(cityId);
  const cityBbox = cityBboxFromConfig(citySlug);
  if (!cityBbox) return { count: 0, stats: EMPTY_STATS };

  const count = catalog.neighborhoods.length;
  const stats = { divar: 0, osm: 0, synthetic: 0 };
  const features = catalog.neighborhoods.map((n, index) => {
    const { geometry, geoSource } = polygonFromCatalogNeighborhood(n, {
      cityBbox,
      index,
      count,
      seed: `${cityId}:${n.id}`,
    });
    stats[geoSource] += 1;
    return makeGeoFeature(n.id, n.name, geometry, geoSource);
  });

  const collection: CityNeighborhoodGeoCollection = {
    type: 'FeatureCollection',
    features,
  };

  await saveCityGeoFile(cityId, collection);

  const synced = syncCatalogGeoFields(catalog.neighborhoods, features);
  await saveCityCatalog(cityId, {
    cityName: catalog.cityName,
    source: catalog.source,
    emptyOnDivar: catalog.emptyOnDivar,
    neighborhoods: synced,
  });

  return { count: features.length, stats };
}

async function main(): Promise<void> {
  await ensureGeoDirs();
  const cityIds = await listCatalogCityIds();
  const cities: Record<string, { cityId: string; featureCount: number; osm: number; divar: number; synthetic: number; manual: number }> = {};
  let total = 0;

  for (const cityId of cityIds) {
    const result = await buildCity(cityId);
    if (result.count > 0) {
      cities[cityId] = {
        cityId,
        featureCount: result.count,
        osm: result.stats.osm,
        divar: result.stats.divar,
        synthetic: result.stats.synthetic,
        manual: 0,
      };
      total += result.count;
      console.log(
        `✓ ${cityId}: ${result.count} polygons (divar ${result.stats.divar}, osm ${result.stats.osm}, synthetic ${result.stats.synthetic})`
      );
    }
  }

  await writeGeoManifest({
    version: 1,
    updatedAt: new Date().toISOString(),
    cities,
    totalFeatures: total,
  });

  console.log(`\nSynthetic geo: ${total} features across ${Object.keys(cities).length} cities`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
