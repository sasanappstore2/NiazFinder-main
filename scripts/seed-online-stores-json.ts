#!/usr/bin/env npx tsx
/**
 * Seed src/data/online-stores.json from DEFAULT_ONLINE_STORE_CATEGORIES.
 * Run: npx tsx scripts/seed-online-stores-json.ts
 */
import { existsSync } from 'fs';
import path from 'path';
import {
  getDefaultManagedOnlineStores,
  writeManagedOnlineStores,
} from '../src/lib/business/online-stores-registry';

const target = path.join(process.cwd(), 'src', 'data', 'online-stores.json');

async function main() {
  if (existsSync(target)) {
    console.log(`Skip: ${target} already exists`);
    return;
  }

  const categories = getDefaultManagedOnlineStores();
  await writeManagedOnlineStores(categories);
  console.log(`Seeded ${categories.length} online store categories → ${target}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
