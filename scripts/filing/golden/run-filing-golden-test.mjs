#!/usr/bin/env node
/** Golden discovery tests: fixture HTML must match expected.json selectors. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = (process.env.ESTATE_SCRAPE_URL || 'http://127.0.0.1:8200').replace(/\/$/, '');
const secret = process.env.ESTATE_SCRAPE_SECRET?.trim() || '';
const root = process.cwd();

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (secret) h['x-estate-scrape-secret'] = secret;
  return h;
}

async function testSite(siteKey) {
  const dir = resolve(root, `fixtures/filing-portals/${siteKey}`);
  const html = readFileSync(resolve(dir, 'list-sample.html'), 'utf8');
  const expected = JSON.parse(readFileSync(resolve(dir, 'expected.json'), 'utf8'));

  const res = await fetch(`${base}/v1/filing-feed/discover-html`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      html,
      baseUrl: `https://${siteKey}.test/list`,
      userCity: 'مشهد',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${siteKey}: discover failed ${JSON.stringify(data)}`);

  const container = data?.blueprint?.listPage?.containerSelector;
  if (container !== expected.containerSelector) {
    throw new Error(`${siteKey}: container mismatch got=${container} want=${expected.containerSelector}`);
  }

  const fieldMap = data?.blueprint?.fieldMap ?? {};
  for (const key of expected.minFieldKeys) {
    if (!fieldMap[key]) throw new Error(`${siteKey}: missing field ${key}`);
  }

  console.log(`[OK] golden ${siteKey}`);
}

async function main() {
  for (const site of ['showmelk', 'maskanyaban']) {
    await testSite(site);
  }
  console.log('ALL GOLDEN FILING TESTS PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
