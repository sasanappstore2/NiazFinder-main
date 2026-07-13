/**
 * Step 2 self-test for CategoryOntologyProvider (`PLAN/semantic-comparator-architecture.md` §2/§9).
 * Uses real slugs from `src/config/categories.ts` — no synthetic ontology, since the whole point
 * of this provider is to reuse that registry unchanged.
 *
 * Run via: npm run test:see-category-ontology
 */
import { categoryOntologyProvider, CATEGORY_UNRELATED_DISTANCE } from '@/semantic-evaluation-engine/ontology/category-ontology-provider';

function ref(id: string) {
  return { namespace: 'category', id };
}

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function testIdentical(): string[] {
  const errors: string[] = [];
  const r = categoryOntologyProvider.relate(ref('apartment-rent'), ref('apartment-rent'));
  if (r.type !== 'identical' || r.distance !== 0) errors.push(fail('identical', JSON.stringify(r)));
  return errors;
}

function testDirectParentChild(): string[] {
  const errors: string[] = [];
  // Exactly the real drift-investigation case: residential-rent -> apartment-rent.
  const parentToChild = categoryOntologyProvider.relate(ref('residential-rent'), ref('apartment-rent'));
  if (parentToChild.type !== 'parent-of' || parentToChild.distance !== 1) {
    errors.push(fail('parent-to-child', JSON.stringify(parentToChild)));
  }
  const childToParent = categoryOntologyProvider.relate(ref('apartment-rent'), ref('residential-rent'));
  if (childToParent.type !== 'child-of' || childToParent.distance !== 1) {
    errors.push(fail('child-to-parent', JSON.stringify(childToParent)));
  }
  return errors;
}

function testGrandparentGrandchild(): string[] {
  const errors: string[] = [];
  const r = categoryOntologyProvider.relate(ref('real-estate'), ref('apartment-rent'));
  if (r.type !== 'parent-of' || r.distance !== 2) errors.push(fail('grandparent', JSON.stringify(r)));
  return errors;
}

function testTrueSiblings(): string[] {
  const errors: string[] = [];
  // apartment-rent and villa-rent share the same immediate parent (residential-rent).
  const r = categoryOntologyProvider.relate(ref('apartment-rent'), ref('villa-rent'));
  if (r.type !== 'sibling' || r.distance !== 2) errors.push(fail('true-siblings', JSON.stringify(r)));
  return errors;
}

function testSameTopBranchDifferentSubBranch(): string[] {
  const errors: string[] = [];
  // The investigation's real "genuine bug" case: motorcycle vs car, both only share depth-0 "vehicles".
  const r = categoryOntologyProvider.relate(ref('motorcycle'), ref('car'));
  if (r.type !== 'sibling' || r.distance !== 2) {
    errors.push(fail('same-top-branch', JSON.stringify(r)));
  }
  return errors;
}

function testUnrelatedDifferentRoots(): string[] {
  const errors: string[] = [];
  const r = categoryOntologyProvider.relate(ref('motorcycle'), ref('laptop'));
  if (r.type !== 'unrelated' || r.distance !== CATEGORY_UNRELATED_DISTANCE) {
    errors.push(fail('unrelated-roots', JSON.stringify(r)));
  }
  return errors;
}

function testUnknownSlug(): string[] {
  const errors: string[] = [];
  const r = categoryOntologyProvider.relate(ref('made-up-slug-xyz'), ref('laptop'));
  if (r.type !== 'unrelated' || r.distance !== CATEGORY_UNRELATED_DISTANCE) {
    errors.push(fail('unknown-slug', JSON.stringify(r)));
  }
  return errors;
}

function testNamespaceMismatchThrows(): string[] {
  const errors: string[] = [];
  let threw = false;
  try {
    categoryOntologyProvider.relate({ namespace: 'location', id: 'rasht' }, ref('laptop'));
  } catch {
    threw = true;
  }
  if (!threw) errors.push(fail('namespace-mismatch', 'expected relate() to throw on a non-category namespace ref'));
  return errors;
}

function testDistanceIsJsonSafe(): string[] {
  const errors: string[] = [];
  const r = categoryOntologyProvider.relate(ref('motorcycle'), ref('laptop'));
  const roundTripped = JSON.parse(JSON.stringify(r));
  if (roundTripped.distance !== r.distance) {
    errors.push(fail('json-safe-distance', `distance changed across JSON round-trip: ${r.distance} -> ${roundTripped.distance}`));
  }
  return errors;
}

export function runCategoryOntologyProviderSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testIdentical,
    testDirectParentChild,
    testGrandparentGrandchild,
    testTrueSiblings,
    testSameTopBranchDifferentSubBranch,
    testUnrelatedDifferentRoots,
    testUnknownSlug,
    testNamespaceMismatchThrows,
    testDistanceIsJsonSafe,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-category-ontology-provider-self-test'));

if (isDirectRun) {
  const { passed, failed } = runCategoryOntologyProviderSelfTest();
  if (failed.length) {
    console.error('CategoryOntologyProvider self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`CategoryOntologyProvider self-test OK: ${passed}/9`);
}
