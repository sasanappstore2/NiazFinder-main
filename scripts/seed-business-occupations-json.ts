#!/usr/bin/env npx tsx
/**
 * Seed src/data/business-occupations.json from DEFAULT_BUSINESS_OCCUPATIONS.
 * Run: npx tsx scripts/seed-business-occupations-json.ts
 */
import { existsSync } from 'fs';
import path from 'path';
import {
  getDefaultManagedOccupations,
  writeManagedOccupations,
} from '../src/lib/business/occupations-registry';

const target = path.join(process.cwd(), 'src', 'data', 'business-occupations.json');

async function main() {
  if (existsSync(target)) {
    console.log(`Skip: ${target} already exists`);
    return;
  }

  const occupations = getDefaultManagedOccupations();
  await writeManagedOccupations(occupations);
  console.log(`Seeded ${occupations.length} occupations → ${target}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
