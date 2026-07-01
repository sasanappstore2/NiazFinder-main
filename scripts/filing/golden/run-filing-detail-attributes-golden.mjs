#!/usr/bin/env node
/** Detail attribute golden: fixture HTML must parse deal/kind + >=12 fields. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const estateDir = resolve(root, 'mini-services/estate-scrape');
const fixtureDir = resolve(estateDir, 'fixtures/filing-portals/detail-samples');
const expected = JSON.parse(readFileSync(resolve(fixtureDir, 'expected.json'), 'utf8'));

function pyParse(htmlPath) {
  const py = `
import json, sys
from app.filing_feed.listing_attribute_parser import parse_listing_attributes
html = open(sys.argv[1], encoding='utf-8').read()
print(json.dumps(parse_listing_attributes(html), ensure_ascii=False))
`;
  const venvPy = resolve(estateDir, '.venv/bin/python');
  const pyBin = existsSync(venvPy) ? venvPy : 'python3';
  const r = spawnSync(pyBin, ['-c', py, htmlPath], {
    cwd: estateDir,
    env: { ...process.env, PYTHONPATH: '.' },
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout.trim());
}

function fieldCount(row) {
  const skip = new Set(['dealType', 'propertyKind', 'city', 'neighborhood', 'location', 'postedAtText']);
  return Object.entries(row).filter(([k, v]) => !skip.has(k) && v != null && v !== '').length;
}

for (const [name, spec] of Object.entries(expected)) {
  const htmlPath = resolve(fixtureDir, `${name}.html`);
  const parsed = pyParse(htmlPath);
  if (String(parsed.fileCode) !== spec.fileCode) {
    throw new Error(`${name}: fileCode expected ${spec.fileCode}, got ${parsed.fileCode}`);
  }
  if (parsed.dealType !== spec.dealType) {
    throw new Error(`${name}: dealType expected ${spec.dealType}, got ${parsed.dealType}`);
  }
  if (parsed.propertyKind !== spec.propertyKind) {
    throw new Error(`${name}: propertyKind expected ${spec.propertyKind}, got ${parsed.propertyKind}`);
  }
  for (const key of spec.required || []) {
    if (!parsed[key]) throw new Error(`${name}: missing required ${key}`);
  }
  for (const key of spec.forbidden || []) {
    if (parsed[key]) throw new Error(`${name}: forbidden ${key}=${parsed[key]}`);
  }
  const n = fieldCount(parsed);
  if (n < spec.minFieldCount) {
    throw new Error(`${name}: field count ${n} < ${spec.minFieldCount}`);
  }
  console.log(`[OK] detail ${name}: deal=${parsed.dealType} fields=${n}`);
}

console.log('ALL DETAIL ATTRIBUTE GOLDEN TESTS PASSED');
