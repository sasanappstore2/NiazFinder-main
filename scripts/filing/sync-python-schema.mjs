#!/usr/bin/env node
/**
 * Export filing domain schema JSON from TypeScript and regenerate Python mirrors.
 *
 * Source of truth: src/lib/filing/schema/*
 * Outputs:
 *   fixtures/filing-portals/schema/attribute-schema.json
 *   fixtures/filing-portals/schema/category-templates.json
 *   mini-services/estate-scrape/app/filing_feed/listing_attribute_schema.py
 *   mini-services/estate-scrape/app/filing_feed/filing_category_templates.py
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = process.cwd();
const schemaDir = resolve(root, 'fixtures/filing-portals/schema');
const exportTs = resolve(root, 'scripts/filing/export-schema.ts');
const pySchema = resolve(root, 'mini-services/estate-scrape/app/filing_feed/listing_attribute_schema.py');

mkdirSync(schemaDir, { recursive: true });

execSync(`npx --yes tsx "${exportTs}"`, { stdio: 'inherit', cwd: root });

const attr = JSON.parse(readFileSync(resolve(schemaDir, 'attribute-schema.json'), 'utf8'));

function pyTuple(values) {
  return `(${values.map((v) => `"${v}"`).join(', ')})`;
}

function pyDict(obj) {
  const lines = Object.entries(obj).map(([k, v]) => `    "${k}": ${JSON.stringify(v)},`);
  return `{\n${lines.join('\n')}\n}`;
}

const listingPy = `"""AUTO-GENERATED from fixtures/filing-portals/schema/attribute-schema.json — do not edit."""

from __future__ import annotations

FILING_DEAL_TYPES = ${pyTuple(attr.FILING_DEAL_TYPES)}
FILING_PROPERTY_KINDS = ${pyTuple(attr.FILING_PROPERTY_KINDS)}

EXTENDED_ATTRIBUTE_KEYS = ${pyTuple(attr.EXTENDED_FILING_ATTRIBUTE_KEYS)}

CORE_FIELD_KEYS = ${pyTuple(attr.CORE_FILING_FIELD_KEYS)}

ALL_FIELD_KEYS = ${pyTuple(attr.ALL_FILING_FIELD_KEYS)}

KIND_BASE_SLUG = ${pyDict(attr.KIND_BASE_SLUG)}

DEAL_SLUG_SUFFIX = ${pyDict(attr.DEAL_SLUG_SUFFIX)}


def resolve_category_slug(deal_type: str | None, property_kind: str | None) -> str | None:
    if not property_kind or property_kind not in FILING_PROPERTY_KINDS:
        return None
    base = KIND_BASE_SLUG[property_kind]
    if not deal_type or deal_type not in FILING_DEAL_TYPES:
        return f"{base}-sale"
    return f"{base}-{DEAL_SLUG_SUFFIX[deal_type]}"
`;

writeFileSync(pySchema, listingPy, 'utf8');

const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
console.log(`sync-python-schema OK  attr=${hash(pySchema)} templates-json=${hash(resolve(schemaDir, 'category-templates.json'))}`);
