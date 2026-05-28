/**
 * Self-test: need categories map to occupations for matching coverage.
 * Run: npx --yes tsx src/lib/business/fixtures/run-need-occupation-map-self-test.ts
 */
import { occupationsForNeedSlug, NEED_LEAVES_FOR_COVERAGE_TEST } from '@/config/need-to-occupation-map';
import { isOccupationSlug } from '@/config/business-occupations';
import { migrateSlugToOccupation } from '@/config/need-to-occupation-map';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

// High-traffic need slugs must resolve to at least one occupation
const critical = ['plumbing', 'apartment-sale', 'cleaning', 'it-services', 'legal-services', 'moving'];

for (const needSlug of critical) {
  const occ = occupationsForNeedSlug(needSlug);
  assert(occ.length > 0, `${needSlug} should map to occupations`);
  assert(occ.every((o) => isOccupationSlug(o)), `${needSlug} occupations valid`);
}

// Sample of all depth>=1 need leaves (excluding jobs-only noise)
let unmapped = 0;
for (const slug of NEED_LEAVES_FOR_COVERAGE_TEST.slice(0, 80)) {
  const occ = occupationsForNeedSlug(slug);
  if (occ.length === 0) {
    unmapped += 1;
    console.warn(`WARN: no occupation for need slug: ${slug}`);
  }
}
assert(unmapped < NEED_LEAVES_FOR_COVERAGE_TEST.length * 0.4, 'too many unmapped need leaves');

const mig = migrateSlugToOccupation('apartment-sale');
assert(mig.confidence === 'high' && mig.occupations.includes('real-estate-agent'), 'apartment-sale migration');

const migPlumber = migrateSlugToOccupation('plumbing');
assert(migPlumber.occupations.includes('plumber'), 'plumbing → plumber');

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('OK: need-occupation map self-test passed');
