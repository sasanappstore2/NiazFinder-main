/**
 * Validate city boundary vs pin center sanity.
 * Run: npx tsx scripts/geo/assert-city-boundaries.ts
 */
import { readJson, ROOT } from './shared';
import path from 'path';

type CityEntry = {
  slug: string;
  lat: number;
  lng: number;
  pinBboxDelta?: { lat: number; lng: number };
  bboxDelta: { lat: number; lng: number };
  viewportCitySlug: string;
  provinceId: string;
};

function kmBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function main() {
  const config = readJson<{ cities: Record<string, CityEntry> }>(
    path.join(ROOT, 'src/data/geo/iran-cities-map-config.json')
  );
  const provinceOverrides = readJson<{ bySlug: Record<string, string> }>(
    path.join(ROOT, 'src/data/geo/city-province-overrides.json')
  ).bySlug;

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const entry of Object.values(config.cities)) {
    const pinDelta = entry.pinBboxDelta ?? entry.bboxDelta;
    const pinKm = pinDelta.lat * 111;

    if (pinKm > 80) {
      warnings.push(`${entry.slug}: pin bbox very large (${pinKm.toFixed(0)} km)`);
    }
    if (pinKm < 2 && entry.viewportCitySlug === entry.slug) {
      warnings.push(`${entry.slug}: pin bbox very small (${pinKm.toFixed(1)} km)`);
    }

    const expectedProvince = provinceOverrides[entry.slug];
    if (expectedProvince && entry.provinceId !== expectedProvince) {
      errors.push(`${entry.slug}: province ${entry.provinceId} expected ${expectedProvince}`);
    }

    if (entry.viewportCitySlug !== entry.slug) {
      const hub = config.cities[entry.viewportCitySlug];
      if (hub) {
        const dist = kmBetween(entry, hub);
        if (dist > 120) {
          warnings.push(
            `${entry.slug}: satellite ${dist.toFixed(0)} km from hub ${entry.viewportCitySlug}`
          );
        }
      }
    }
  }

  const samples = ['karaj', 'shahriar', 'tehran', 'mashhad', 'tabriz', 'rey'];
  for (const slug of samples) {
    const e = config.cities[slug];
    if (!e) {
      warnings.push(`sample missing: ${slug}`);
      continue;
    }
    if (e.viewportCitySlug === 'taleghan' || e.originCitySlug === 'taleghan') {
      errors.push(`${slug}: still linked to taleghan hub`);
    }
    if (slug === 'karaj' && e.provinceId !== 'alborz') {
      errors.push('karaj: province must be alborz');
    }
    if (slug === 'karaj' && e.viewportCitySlug !== 'karaj') {
      errors.push('karaj: viewport must be karaj');
    }
  }

  console.log(`Checked ${Object.keys(config.cities).length} cities`);
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings.slice(0, 15)) console.log(`  - ${w}`);
    if (warnings.length > 15) console.log(`  ... +${warnings.length - 15} more`);
  }
  if (errors.length) {
    console.error(`\nErrors (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('\nCity boundary sanity: ok');
}

main();
