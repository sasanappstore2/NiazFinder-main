/**
 * Online store registry integrity self-test.
 * Run: npx --yes tsx src/lib/business/fixtures/run-online-store-registry-self-test.ts
 */
import {
  ONLINE_STORE_CATEGORIES,
  getPickableOnlineStoreCount,
  isPickableOnlineStoreSlug,
} from '@/config/online-stores';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const slugs = ONLINE_STORE_CATEGORIES.map((c) => c.slug);
const unique = new Set(slugs);
assert(unique.size === slugs.length, 'all online store slugs must be unique');

for (const cat of ONLINE_STORE_CATEGORIES) {
  if (cat.parentSlug) {
    const parent = ONLINE_STORE_CATEGORIES.find((p) => p.slug === cat.parentSlug);
    assert(parent != null, `parent ${cat.parentSlug} exists for ${cat.slug}`);
  }
  if (cat.depth === 1) {
    assert(cat.slug.startsWith('online-'), `leaf slug must start with online-: ${cat.slug}`);
    assert(isPickableOnlineStoreSlug(cat.slug), `depth-1 slug pickable: ${cat.slug}`);
  }
}

const pickableCount = getPickableOnlineStoreCount();
assert(pickableCount >= 60, `at least 60 pickable online verticals (got ${pickableCount})`);
assert(
  isPickableOnlineStoreSlug('online-costume-jewelry'),
  'online-costume-jewelry must be pickable'
);

if (failed === 0) {
  console.log(`OK: online store registry (${pickableCount} pickable leaves, ${unique.size} total slugs)`);
} else {
  console.error(`FAILED: ${failed} assertion(s)`);
  process.exit(1);
}
