#!/usr/bin/env node
/** Extraction golden: fixture HTML + blueprint must yield expected listing coverage. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const estateDir = resolve(root, 'mini-services/estate-scrape');

function extractOffline(siteKey) {
  const dir = resolve(estateDir, `fixtures/filing-portals/${siteKey}`);
  const html = readFileSync(resolve(dir, 'list-sample.html'), 'utf8');
  const blueprintPath = resolve(dir, 'blueprint.json');
  const expectedPath = resolve(dir, 'expected-listings.json');
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));

  const py = `
import json, sys
from app.filing_feed.site_indexer import discover_from_html
from app.filing_feed.dom_listing_extractor import extract_listings_from_html
html = open(sys.argv[1], encoding='utf-8').read()
base = sys.argv[2]
bp_path = sys.argv[3]
if bp_path and bp_path.strip():
    import json as j
    bp = j.load(open(bp_path, encoding='utf-8'))
else:
    bp = discover_from_html(html, base, 'مشهد')['blueprint']
rows = extract_listings_from_html(html, base, bp)
print(json.dumps(rows, ensure_ascii=False))
`;
  const venvPy = resolve(estateDir, '.venv/bin/python');
  const pyBin = existsSync(venvPy) ? venvPy : 'python3';
  const r = spawnSync(
    pyBin,
    [
      '-c',
      py,
      resolve(dir, 'list-sample.html'),
      `https://${siteKey}.test/`,
      existsSync(blueprintPath) ? blueprintPath : '',
    ],
    { cwd: estateDir, env: { ...process.env, PYTHONPATH: '.' }, encoding: 'utf8' }
  );
  if (r.status !== 0) {
    throw new Error(`${siteKey}: extract failed\n${r.stderr}`);
  }
  const listings = JSON.parse(r.stdout.trim());

  const n = listings.length;
  if (n < expected.minListings) {
    throw new Error(`${siteKey}: expected >=${expected.minListings} listings, got ${n}`);
  }

  const rate = (fn) => listings.filter(fn).length / n;
  const fileCodeRate = rate((r) => Boolean(r.fileCode || r.externalId));
  const titleRate = rate((r) => (r.title || '').length >= 6);
  const dealTypeRate = rate((r) => Boolean(r.dealType));
  const priceRate = rate((r) => Boolean(r.price || r.deposit || r.monthlyRent));

  if (fileCodeRate < (expected.minFileCodeRate ?? 0.85)) {
    throw new Error(`${siteKey}: fileCode rate ${fileCodeRate} below threshold`);
  }
  if (titleRate < (expected.minTitleRate ?? 0.98)) {
    throw new Error(`${siteKey}: title rate ${titleRate} below threshold`);
  }
  if (expected.minDealTypeRate && dealTypeRate < expected.minDealTypeRate) {
    throw new Error(`${siteKey}: dealType rate ${dealTypeRate} below threshold`);
  }
  if (priceRate < (expected.minPriceOrRentRate ?? 0.7)) {
    throw new Error(`${siteKey}: price/rent rate ${priceRate} below threshold`);
  }

  for (const code of expected.sampleFileCodes || []) {
    if (!listings.some((r) => String(r.fileCode || r.externalId) === code)) {
      throw new Error(`${siteKey}: missing sample fileCode ${code}`);
    }
  }

  console.log(
    `[OK] extraction ${siteKey}: n=${n} fileCode=${(fileCodeRate * 100).toFixed(0)}% price=${(priceRate * 100).toFixed(0)}%`
  );
}

async function main() {
  for (const site of ['showmelk', 'maskanyaban']) {
    extractOffline(site);
  }
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync('node', ['scripts/filing-portal/run-filing-detail-attributes-golden.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log('ALL EXTRACTION GOLDEN TESTS PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
