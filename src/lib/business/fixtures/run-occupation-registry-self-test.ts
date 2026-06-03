/**
 * Self-test: occupation registry integrity.
 * Run: npx --yes tsx src/lib/business/fixtures/run-occupation-registry-self-test.ts
 */
import { readManagedOccupations, setOccupationsCache } from '@/lib/business/occupations-registry';
import {
  getBusinessOccupationsList,
  getPickableOccupationCount,
  getPickableOccupations,
  isOccupationSlug,
  LEGACY_OCCUPATION_ALIASES,
  resolveOccupationSlug,
} from '@/config/business-occupations';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

async function main() {
  const managed = await readManagedOccupations();
  setOccupationsCache(managed);

  const occupations = getBusinessOccupationsList();
  const slugs = occupations.map((o) => o.slug);
  const unique = new Set(slugs);
  assert(unique.size === slugs.length, 'duplicate occupation slugs');

  for (const o of occupations) {
    if (o.depth === 1) {
      assert(o.parentSlug != null, `${o.slug} depth-1 must have parent`);
      assert(isOccupationSlug(o.parentSlug!), `${o.slug} parent ${o.parentSlug} must exist`);
    }
    if (o.depth === 0) {
      assert(o.parentSlug === null, `${o.slug} sector must have null parent`);
    }
  }

  for (const [legacy, target] of Object.entries(LEGACY_OCCUPATION_ALIASES)) {
    assert(isOccupationSlug(target), `legacy alias ${legacy} → ${target} must resolve`);
    assert(resolveOccupationSlug(legacy) === target, `resolveOccupationSlug(${legacy})`);
  }

  const pickable = getPickableOccupations();
  assert(pickable.length >= 140, `expected ≥140 real jobs, got ${pickable.length}`);
  assert(isOccupationSlug('car-dealership'), 'car-dealership must exist');
  assert(getPickableOccupationCount() === pickable.length, 'count helper');

  if (failed > 0) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log(`OK: occupation registry self-test passed (${pickable.length} jobs, ${managed.length} managed)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
