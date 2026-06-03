/**
 * Self-test: online store registry integrity.
 * Run: npx --yes tsx src/lib/business/fixtures/run-online-store-registry-self-test.ts
 */
import { readManagedOnlineStores, setOnlineStoresCache } from '@/lib/business/online-stores-registry';
import {
  getOnlineStoreCategoriesList,
  getPickableOnlineStoreCount,
  getPickableOnlineStores,
  isOnlineStoreSlug,
} from '@/config/online-stores';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

async function main() {
  const managed = await readManagedOnlineStores();
  setOnlineStoresCache(managed);

  const categories = getOnlineStoreCategoriesList();
  const slugs = categories.map((c) => c.slug);
  const unique = new Set(slugs);
  assert(unique.size === slugs.length, 'duplicate online store slugs');

  for (const cat of categories) {
    if (cat.depth === 1) {
      assert(cat.parentSlug != null, `${cat.slug} depth-1 must have parent`);
      assert(isOnlineStoreSlug(cat.parentSlug!), `${cat.slug} parent ${cat.parentSlug} must exist`);
      assert(cat.slug.startsWith('online-'), `${cat.slug} must start with online-`);
    }
    if (cat.depth === 0) {
      assert(cat.parentSlug === null, `${cat.slug} sector must have null parent`);
      assert(cat.slug.startsWith('online-'), `${cat.slug} must start with online-`);
    }
  }

  const pickable = getPickableOnlineStores();
  assert(pickable.length >= 70, `expected ≥70 pickable leaves, got ${pickable.length}`);
  assert(isOnlineStoreSlug('online-costume-jewelry'), 'online-costume-jewelry must exist');
  assert(getPickableOnlineStoreCount() === pickable.length, 'count helper');

  if (failed > 0) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log(`OK: online store registry self-test passed (${pickable.length} leaves, ${managed.length} managed)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
