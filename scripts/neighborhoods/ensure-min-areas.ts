/**
 * Ensure every neighborhood has at least 3 sub-areas.
 * Run: npx tsx scripts/neighborhoods/ensure-min-areas.ts
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  listCatalogCityIds,
  loadCityCatalogFile,
  saveCityCatalog,
} from '../../src/lib/neighborhoods/catalog';
import { REPORTS_DIR } from './lib';
import {
  extraFallbackAreas,
  fallbackAreas,
  isCorruptedAreaLabel,
} from './geo-lib';

const MIN_AREAS = 3;

function mergeAreas(existing: string[] | undefined, extra: string[]): string[] {
  const set = new Set((existing ?? []).map((a) => a.trim()).filter(Boolean));
  for (const a of extra) {
    const t = a.trim();
    if (t) set.add(t);
  }
  return [...set];
}

export function ensureAreas(name: string, areas: string[] | undefined): string[] {
  let merged = (areas ?? []).filter((a) => !isCorruptedAreaLabel(a));
  if (merged.length >= MIN_AREAS) return merged;

  merged = mergeAreas(merged, fallbackAreas(name));

  if (merged.length < MIN_AREAS) {
    merged = mergeAreas(merged, extraFallbackAreas(name));
  }

  return merged;
}

async function main(): Promise<void> {
  const cityIds = await listCatalogCityIds();
  const reportRows: string[] = ['cityId,neighborhoodId,name,areasBefore,areasAfter'];
  let patched = 0;

  for (const cityId of cityIds) {
    const catalog = await loadCityCatalogFile(cityId);
    if (!catalog?.neighborhoods?.length) continue;

    let cityPatched = 0;
    for (const hood of catalog.neighborhoods) {
      const before = hood.areas ?? [];
      const hadCorruption = before.some(isCorruptedAreaLabel);
      const after = ensureAreas(hood.name, before);
      const changed =
        hadCorruption ||
        after.length !== before.length ||
        after.some((a, i) => a !== before[i]);
      if (!changed) continue;
      hood.areas = after;
      cityPatched += 1;
      patched += 1;
      reportRows.push(`${cityId},${hood.id},${hood.name},${before.length},${after.length}`);
    }

    if (cityPatched > 0) {
      await saveCityCatalog(cityId, {
        cityName: catalog.cityName,
        source: catalog.source,
        emptyOnDivar: catalog.emptyOnDivar,
        neighborhoods: catalog.neighborhoods,
      });
      console.log(`ok ${cityId}: ${cityPatched} neighborhoods fixed`);
    }
  }

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, 'neighborhoods-areas-coverage.csv');
  await fs.writeFile(reportPath, reportRows.join('\n'), 'utf8');

  console.log(`\nPatched ${patched} neighborhoods -> ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
