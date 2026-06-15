/**
 * Remove synthetic placeholder sub-areas from all neighborhood catalogs.
 * Run: npm run neighborhoods:strip-synthetic
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  saveCityCatalog,
} from '../../src/lib/neighborhoods/catalog';
import {
  displayAreaLabels,
  isSyntheticAreaLabel,
  sanitizeAreaLabels,
} from '../../src/lib/neighborhoods/area-labels';
import { REPORTS_DIR } from './lib';

async function main(): Promise<void> {
  const cityIds = await listCatalogCityIds();
  let strippedHoods = 0;
  let removedLabels = 0;
  const reportRows: string[] = ['cityId,neighborhoodId,name,removed,before,after'];

  for (const cityId of cityIds) {
    const catalog = await loadCityCatalogFile(cityId);
    if (!catalog?.neighborhoods?.length) continue;

    let cityPatched = 0;
    for (const hood of catalog.neighborhoods) {
      const before = sanitizeAreaLabels(hood.areas, hood.name);
      const after = displayAreaLabels(hood.areas, hood.name);
      const removed = before.filter((label) => isSyntheticAreaLabel(label, hood.name));
      if (removed.length === 0 && after.length === before.length) continue;

      hood.areas = after.length ? after : undefined;
      cityPatched += 1;
      strippedHoods += 1;
      removedLabels += removed.length;
      reportRows.push(
        `${cityId},${hood.id},${hood.name},${removed.length},${before.length},${after.length}`
      );
    }

    if (cityPatched > 0) {
      await saveCityCatalog(cityId, {
        cityName: catalog.cityName,
        source: catalog.source,
        emptyOnDivar: catalog.emptyOnDivar,
        neighborhoods: catalog.neighborhoods,
      });
      console.log(`ok ${cityId}: stripped ${cityPatched} neighborhoods`);
    }
  }

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, 'neighborhoods-strip-synthetic.csv');
  await fs.writeFile(reportPath, reportRows.join('\n'), 'utf8');

  console.log(`\nStripped ${removedLabels} synthetic labels from ${strippedHoods} neighborhoods`);
  console.log(`Report ? ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
