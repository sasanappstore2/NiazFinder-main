import { promises as fs } from 'fs';
import { loadAdminCities } from './lib';
import { rebuildManifestFromCatalog, writeManifest } from '../../src/lib/neighborhoods/catalog';

async function main() {
  const admin = await loadAdminCities();
  const map = JSON.parse(
    await fs.readFile('src/data/neighborhoods/divar-city-map.json', 'utf8')
  ) as Record<string, unknown>;
  const mapped = new Set(Object.keys(map));
  const unmapped = admin.filter((c) => !mapped.has(c.id)).map((c) => c.id);
  const manifest = await rebuildManifestFromCatalog();
  manifest.unmapped = unmapped;
  await writeManifest(manifest);
  console.log({
    adminCities: admin.length,
    mapped: mapped.size,
    unmapped: unmapped.length,
    withNeighborhoods: manifest.citiesWithNeighborhoods,
    totalNeighborhoods: manifest.totalNeighborhoods,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
