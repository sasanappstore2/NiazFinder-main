/**
 * Ensures MaskanYaban field registry parity across TS schema keys and synced Python mirror.
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALL_FILING_FIELD_KEYS } from '@/lib/filing/schema/attribute-schema';

const MASKANYABAN_DETAIL_FIELDS = [
  'title',
  'fileCode',
  'dealType',
  'propertyKind',
  'city',
  'neighborhood',
  'location',
  'price',
  'deposit',
  'monthlyRent',
  'area',
  'rooms',
  'floor',
  'pricePerMeter',
  'postedAt',
  'totalFloors',
  'unitsCount',
  'buildingAge',
  'documentType',
  'cabinet',
  'flooring',
  'wallCover',
  'facade',
  'orientation',
  'heating',
  'cooling',
  'exchangeable',
  'hasParking',
  'hasStorage',
  'hasElevator',
  'hasSecurityDoor',
  'hasTerrace',
  'hasBuiltInWardrobe',
  'description',
  'detailUrl',
  'image',
  'images',
] as const;

function main() {
  const registry = new Set<string>(ALL_FILING_FIELD_KEYS);
  const missing = MASKANYABAN_DETAIL_FIELDS.filter((k) => !registry.has(k));
  assert.equal(missing.length, 0, `missing registry keys: ${missing.join(', ')}`);

  execSync('node scripts/filing/sync-python-schema.mjs', { stdio: 'inherit', cwd: process.cwd() });

  const pyPath = resolve(
    process.cwd(),
    'mini-services/estate-scrape/app/filing_feed/listing_attribute_schema.py'
  );
  const py = readFileSync(pyPath, 'utf8');
  const match = py.match(/ALL_FIELD_KEYS = \(([\s\S]*?)\)/);
  assert.ok(match, 'ALL_FIELD_KEYS tuple missing in generated Python');
  const pyKeys = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    pyKeys,
    [...ALL_FILING_FIELD_KEYS],
    'Python ALL_FIELD_KEYS out of sync with TypeScript'
  );

  console.log(`filing-field-parity OK (${MASKANYABAN_DETAIL_FIELDS.length} fields)`);
}

main();
