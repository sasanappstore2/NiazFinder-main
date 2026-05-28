/**
 * Self-test: category filter registry resolution.
 * Run: npx tsx src/lib/category-filters/run-registry-self-test.ts
 */
import { getFiltersForCategory } from '@/config/category-filters/registry';
import { parseFilters, serializeFilters } from '@/lib/filters/parser';

const CASES = [
  { slug: 'apartment-sale', expectBrowseKeys: ['rooms', 'areaMin', 'pricePerMeterMin'] },
  { slug: 'suite-apartment-rent', expectBrowseKeys: ['guestCount', 'nightlyRent'] },
  { slug: 'car-ride', expectBrowseKeys: ['condition', 'yearMin'] },
  { slug: 'mobile-phone', expectBrowseKeys: ['storage', 'condition'] },
  { slug: 'plumbing', expectHidden: ['serviceCategory'] },
  { slug: 'jobs', expectBrowseKeys: ['roleType'] },
] as const;

let failed = 0;

for (const c of CASES) {
  const { browseFields } = getFiltersForCategory(c.slug, 'need');
  const keys = new Set(browseFields.map((f) => f.key));

  if ('expectBrowseKeys' in c) {
    for (const k of c.expectBrowseKeys) {
      if (!keys.has(k) && !browseFields.some((f) => f.key.includes(k.replace('Min', '')))) {
        console.error(`FAIL ${c.slug}: missing browse key ${k}`);
        failed++;
      }
    }
  }

  if ('expectHidden' in c) {
    for (const k of c.expectHidden) {
      if (keys.has(k)) {
        console.error(`FAIL ${c.slug}: should hide ${k}`);
        failed++;
      }
    }
  }
}

const parsed = parseFilters(
  new URLSearchParams('dealType=buy&rooms=2&area=80-120&price=1000000-5000000')
);
if (parsed.attributes.dealType !== 'buy') {
  console.error('FAIL parse dealType');
  failed++;
}
if (parsed.attributes.rooms !== '2') {
  console.error('FAIL parse rooms');
  failed++;
}
if (parsed.attributes.areaMin !== '80' || parsed.attributes.areaMax !== '120') {
  console.error('FAIL parse area range', parsed.attributes);
  failed++;
}

const back = serializeFilters(parsed).toString();
if (!back.includes('dealType=buy') || !back.includes('area=80-120')) {
  console.error('FAIL serialize', back);
  failed++;
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log('category-filters registry self-test: OK');
