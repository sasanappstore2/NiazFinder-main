/**
 * Report neighborhood area label quality across all catalogs.
 * Run: npm run neighborhoods:report-quality
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  readManifest,
} from '../../src/lib/neighborhoods/catalog';
import {
  displayAreaLabels,
  isSyntheticAreaLabel,
} from '../../src/lib/neighborhoods/area-labels';
import { loadAdminCities } from './lib';
import { REPORTS_DIR } from './lib';

async function main(): Promise<void> {
  const adminCities = await loadAdminCities();
  const manifest = await readManifest();
  const cityIds = await listCatalogCityIds();

  let totalHoods = 0;
  let withDisplayAreas = 0;
  let syntheticRemaining = 0;
  let noAreasNoGeo = 0;

  const citiesMissingCatalog: string[] = [];

  for (const city of adminCities) {
    const catalog =
      (await loadCityCatalogFile(city.id)) ??
      (await Promise.all(
        [city.id, `${city.id}-city`].map((id) => loadCityCatalogFile(id))
      )).find(Boolean);

    if (!catalog?.neighborhoods?.length) {
      citiesMissingCatalog.push(city.id);
      continue;
    }

    for (const hood of catalog.neighborhoods) {
      totalHoods += 1;
      const display = displayAreaLabels(hood.areas, hood.name);
      if (display.length > 0) withDisplayAreas += 1;
      if (display.length === 0 && !hood.bbox && !hood.centroid) noAreasNoGeo += 1;
      for (const area of hood.areas ?? []) {
        if (isSyntheticAreaLabel(area, hood.name)) syntheticRemaining += 1;
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      adminCities: adminCities.length,
      catalogCities: cityIds.length,
      manifestTotalNeighborhoods: manifest.totalNeighborhoods,
      totalNeighborhoodsScanned: totalHoods,
      withDisplayAreas,
      withDisplayAreasPct:
        totalHoods > 0 ? Math.round((withDisplayAreas / totalHoods) * 1000) / 10 : 0,
      syntheticLabelsRemaining: syntheticRemaining,
      hoodsWithoutAreasOrGeo: noAreasNoGeo,
      citiesMissingCatalog: citiesMissingCatalog.length,
      emptyOnDivar: manifest.emptyOnDivar?.length ?? 0,
      unmapped: manifest.unmapped?.length ?? 0,
    },
    citiesMissingCatalog,
  };

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const out = path.join(REPORTS_DIR, 'neighborhood-areas-quality.json');
  await fs.writeFile(out, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report ? ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
