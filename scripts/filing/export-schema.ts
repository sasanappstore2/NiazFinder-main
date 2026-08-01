import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FILING_DEAL_TYPES,
  FILING_PROPERTY_KINDS,
  EXTENDED_FILING_ATTRIBUTE_KEYS,
  CORE_FILING_FIELD_KEYS,
  ALL_FILING_FIELD_KEYS,
} from '../../src/lib/filing/schema/attribute-schema';
import { FILING_CATEGORY_TEMPLATES } from '../../src/lib/filing/schema/category-templates';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const schemaDir = resolve(root, 'fixtures/filing-portals/schema');
mkdirSync(schemaDir, { recursive: true });

const KIND_BASE_SLUG = {
  apartment: 'apartment',
  villa: 'villa',
  land: 'land',
  office: 'office',
  shop: 'shop',
  commercial: 'commercial',
};

const DEAL_SLUG_SUFFIX = {
  sell: 'sale',
  rent_rahn_ejare: 'rent-rahn-ejare',
  rent_rahn_full: 'rent-rahn-full',
  rent_short_term: 'rent-short-term',
};

writeFileSync(
  resolve(schemaDir, 'attribute-schema.json'),
  JSON.stringify(
    {
      FILING_DEAL_TYPES,
      FILING_PROPERTY_KINDS,
      EXTENDED_FILING_ATTRIBUTE_KEYS,
      CORE_FILING_FIELD_KEYS,
      ALL_FILING_FIELD_KEYS,
      KIND_BASE_SLUG,
      DEAL_SLUG_SUFFIX,
    },
    null,
    2
  ),
  'utf8'
);

writeFileSync(
  resolve(schemaDir, 'category-templates.json'),
  JSON.stringify({ FILING_CATEGORY_TEMPLATES }, null, 2),
  'utf8'
);

console.log('exported filing schema JSON');
