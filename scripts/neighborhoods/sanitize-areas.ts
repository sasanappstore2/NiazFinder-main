/**
 * Clean neighborhood area labels: remove ???? corruption and street block numbers.
 * Run: npx tsx scripts/neighborhoods/sanitize-areas.ts
 */
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  saveCityCatalog,
} from '../../src/lib/neighborhoods/catalog';
import { sanitizeAreaLabels } from '../../src/lib/neighborhoods/area-labels';
import { ensureAreas } from './ensure-min-areas';

async function main(): Promise<void> {
  let fixed = 0;

  for (const cityId of await listCatalogCityIds()) {
    const catalog = await loadCityCatalogFile(cityId);
    if (!catalog?.neighborhoods?.length) continue;

    let cityFixed = 0;
    for (const hood of catalog.neighborhoods) {
      const before = hood.areas ?? [];
      const sanitized = sanitizeAreaLabels(before, hood.name);
      const after = ensureAreas(hood.name, sanitized);
      const same =
        after.length === before.length && after.every((a, i) => a === before[i]);
      if (same) continue;
      hood.areas = after;
      cityFixed += 1;
      fixed += 1;
    }

    if (cityFixed > 0) {
      await saveCityCatalog(cityId, {
        cityName: catalog.cityName,
        source: catalog.source,
        emptyOnDivar: catalog.emptyOnDivar,
        neighborhoods: catalog.neighborhoods,
      });
      console.log(`ok ${cityId}: ${cityFixed} neighborhoods sanitized`);
    }
  }

  console.log(`\nSanitized ${fixed} neighborhoods`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
