/**
 * Auto-suggest manual Divar slug mappings for admin cities that did not match.
 * Run: npx tsx scripts/neighborhoods/build-manual-map.ts
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  NEIGHBORHOODS_ROOT,
  buildDivarIndexes,
  fetchDivarCities,
  loadAdminCities,
  loadManualMap,
  normalizePersianName,
  resolveDivarCity,
  adminSlugForCityId,
} from './lib';

function normSlug(value: string): string {
  return value
    .replace(/-city$/i, '')
    .replace(/-/g, '')
    .toLowerCase();
}

async function main() {
  const adminCities = await loadAdminCities();
  const divarCities = await fetchDivarCities();
  const indexes = buildDivarIndexes(divarCities);
  const existing = await loadManualMap();

  const byNormSlug = new Map<string, { slug: string; name: string }>();
  for (const city of divarCities) {
    byNormSlug.set(normSlug(city.slug), { slug: city.slug, name: city.name });
  }

  const suggestions: Record<string, string> = { ...existing };
  const unresolved: string[] = [];

  for (const adminCity of adminCities) {
    if (resolveDivarCity(adminCity, indexes, suggestions)) continue;

    const candidates = [
      normSlug(adminCity.id),
      normSlug(adminSlugForCityId(adminCity.id)),
      normalizePersianName(adminCity.name).replace(/\s/g, ''),
    ];

    let hit: string | null = null;
    for (const key of candidates) {
      const divar = byNormSlug.get(key);
      if (divar) {
        hit = divar.slug;
        break;
      }
    }

    if (!hit) {
      const nameKey = normalizePersianName(adminCity.name);
      for (const city of divarCities) {
        const divarName = normalizePersianName(city.name);
        if (divarName === nameKey || divarName.replace(/\s/g, '') === nameKey.replace(/\s/g, '')) {
          hit = city.slug;
          break;
        }
      }
    }

    if (hit) suggestions[adminCity.id] = hit;
    else unresolved.push(`${adminCity.id} (${adminCity.name})`);
  }

  const out = path.join(NEIGHBORHOODS_ROOT, 'divar-city-map.manual.json');
  await fs.writeFile(out, JSON.stringify(suggestions, null, 2), 'utf8');
  console.log(`Wrote ${Object.keys(suggestions).length} manual entries → ${out}`);
  console.log(`Still unresolved: ${unresolved.length}`);
  if (unresolved.length) {
    console.log(unresolved.slice(0, 30).join('\n'));
    if (unresolved.length > 30) console.log('...');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
