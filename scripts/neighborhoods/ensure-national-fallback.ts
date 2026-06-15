/**
 * Ensure every admin city has at least one neighborhood in catalog.
 * Run: npm run neighborhoods:ensure-national-fallback
 */
import { makeLocationId } from '../../src/lib/admin-locations';
import {
  loadCityCatalogFile,
  rebuildManifestFromCatalog,
  resolveCatalogCityIdCandidates,
  saveCityCatalog,
} from '../../src/lib/neighborhoods/catalog';
import { loadAdminCities, adminSlugForCityId } from './lib';
import { cityBboxFromConfig } from './geo-lib';

async function catalogCount(cityId: string): Promise<number> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const file = await loadCityCatalogFile(candidate);
    if (file) return file.neighborhoods?.length ?? 0;
  }
  return 0;
}

async function main(): Promise<void> {
  const admin = await loadAdminCities();
  let created = 0;

  for (const city of admin) {
    const count = await catalogCount(city.id);
    if (count > 0) continue;

    const id = makeLocationId(city.name);
    const slug = adminSlugForCityId(city.id);
    const cityBbox = cityBboxFromConfig(slug);
    const centroid = cityBbox
      ? {
          lat: (cityBbox.south + cityBbox.north) / 2,
          lng: (cityBbox.west + cityBbox.east) / 2,
        }
      : undefined;

    await saveCityCatalog(city.id, {
      cityName: city.name,
      source: 'osm',
      emptyOnDivar: true,
      neighborhoods: [
        {
          id,
          name: city.name,
          nameEn: city.id,
          ...(centroid ? { centroid } : {}),
          ...(cityBbox ? { bbox: cityBbox } : {}),
          ...(cityBbox ? { geoSource: 'synthetic' as const } : {}),
        },
      ],
    });
    created += 1;
    console.log(`fallback ${city.id} (${city.name})`);
  }

  const manifest = await rebuildManifestFromCatalog();
  console.log(`\nCreated ${created} fallback catalogs`);
  console.log(`Manifest: ${manifest.totalNeighborhoods} neighborhoods in ${manifest.citiesWithNeighborhoods} cities`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
