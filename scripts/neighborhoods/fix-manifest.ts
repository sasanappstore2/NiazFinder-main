import { promises as fs } from 'fs';
import { loadAdminCities, loadManualMap } from './lib';
import {
  loadCityCatalogFile,
  rebuildManifestFromCatalog,
  resolveCatalogCityIdCandidates,
  writeManifest,
} from '../../src/lib/neighborhoods/catalog';

async function catalogCountForAdminCity(cityId: string): Promise<number> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const file = await loadCityCatalogFile(candidate);
    if (file) return file.neighborhoods?.length ?? 0;
  }
  return 0;
}

async function main() {
  const admin = await loadAdminCities();
  const map = JSON.parse(
    await fs.readFile('src/data/neighborhoods/divar-city-map.json', 'utf8')
  ) as Record<string, unknown>;
  const manual = await loadManualMap();
  const mapped = new Set([...Object.keys(map), ...Object.keys(manual)]);
  const manifest = await rebuildManifestFromCatalog();

  const unmapped: string[] = [];
  const emptyOnDivar: string[] = [];
  for (const city of admin) {
    const count = await catalogCountForAdminCity(city.id);
    if (count === 0) {
      emptyOnDivar.push(city.id);
      if (!mapped.has(city.id)) unmapped.push(city.id);
    }
  }

  manifest.unmapped = unmapped;
  manifest.emptyOnDivar = emptyOnDivar;
  await writeManifest(manifest);
  console.log({
    adminCities: admin.length,
    mapped: mapped.size,
    unmapped: unmapped.length,
    emptyOnDivar: emptyOnDivar.length,
    withNeighborhoods: manifest.citiesWithNeighborhoods,
    totalNeighborhoods: manifest.totalNeighborhoods,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
