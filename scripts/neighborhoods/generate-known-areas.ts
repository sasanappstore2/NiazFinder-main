/**
 * Generate known-areas.json from neighborhood catalogs for intake title/area hints.
 * Run: npm run neighborhoods:generate-known-areas
 */
import { promises as fs } from 'fs';
import path from 'path';
import { listCatalogCityIds, loadCityCatalogFile } from '../../src/lib/neighborhoods/catalog';

const OUT = path.join(process.cwd(), 'src/data/neighborhoods/known-areas.json');

/** Priority cities ? full name + area aliases included first. */
const PRIORITY_CITY_IDS = new Set([
  'mashhad',
  'tehran-city',
  'tehran',
  'isfahan-city',
  'isfahan',
  'shiraz-city',
  'shiraz',
  'tabriz-city',
  'tabriz',
  'karaj',
  'alborz-karaj',
  'ahvaz-city',
  'ahvaz',
  'qom-city',
  'qom',
  'kerman-city',
  'kerman',
  'rasht-city',
  'rasht',
  'yazd-city',
  'yazd',
]);

const LOCATION_STOPWORDS = new Set([
  'در',
  'به',
  'از',
  'تا',
  'برای',
  'و',
  'یا',
  'که',
  'این',
  'آن',
  'با',
  'هر',
  'کل',
  'شهر',
  'استان',
  'محله',
  'منطقه',
  'نزدیک',
  'حرم',
  'مترو',
  'بیمارستان',
  'حد',
  'نو',
  'محدوده',
  'خیابان',
  'بلوار',
]);

function normalizeAreaLabel(value: string): string {
  return value.replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
}

function isUsefulAreaLabel(label: string): boolean {
  const t = normalizeAreaLabel(label);
  if (t.length < 2 || t.length > 48) return false;
  if (LOCATION_STOPWORDS.has(t)) return false;
  if (/^\d+$/.test(t)) return false;
  return true;
}

async function main(): Promise<void> {
  const cityIds = await listCatalogCityIds();
  const globalSet = new Set<string>();
  const byCity: Record<string, string[]> = {};

  for (const cityId of cityIds) {
    const file = await loadCityCatalogFile(cityId);
    if (!file?.neighborhoods?.length) continue;

    const cityAreas = new Set<string>();
    const isPriority = PRIORITY_CITY_IDS.has(cityId);

    for (const n of file.neighborhoods) {
      for (const candidate of [n.name, ...(n.areas ?? [])]) {
        const label = normalizeAreaLabel(candidate);
        if (!isUsefulAreaLabel(label)) continue;
        cityAreas.add(label);
        if (isPriority) globalSet.add(label);
      }
    }

    if (cityAreas.size) {
      byCity[cityId] = [...cityAreas].sort((a, b) => a.localeCompare(b, 'fa'));
    }
  }

  const areas = [...globalSet].sort((a, b) => b.length - a.length || a.localeCompare(b, 'fa'));

  const payload = {
    generatedAt: new Date().toISOString(),
    areas,
    byCity,
    stats: {
      globalCount: areas.length,
      cities: Object.keys(byCity).length,
    },
  };

  await fs.writeFile(OUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${OUT} ? ${areas.length} global area labels across ${Object.keys(byCity).length} cities`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
