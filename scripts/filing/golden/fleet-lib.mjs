#!/usr/bin/env node
/** Shared helpers for filing fleet onboard/eval scripts. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

export const root = process.cwd();
export const estateDir = resolve(root, 'mini-services/estate-scrape');
export const base = (process.env.ESTATE_SCRAPE_URL || 'http://127.0.0.1:8200').replace(/\/$/, '');
export const secret = process.env.ESTATE_SCRAPE_SECRET?.trim() || '';
export const manifestPath =
  process.env.FILING_FLEET_MANIFEST ||
  resolve(root, 'fixtures/filing-portals/fleet-manifest.json');
export const blueprintDir = resolve(root, 'tmp/fleet-blueprints');
export const reportPath = resolve(root, 'tmp/fleet-eval-report.json');

export function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (secret) h['x-estate-scrape-secret'] = secret;
  return h;
}

export function loadManifest() {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const targetUrl = process.env.FILING_FLEET_TARGET_URL?.trim();
  if (targetUrl) {
    const custom = raw.sites.find((s) => s.siteKey === 'custom-target');
    if (custom) {
      custom.enabled = true;
      custom.entryUrl = targetUrl;
      custom.listingsUrl = targetUrl;
      custom.skipReason = undefined;
    }
  }
  return raw;
}

export function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

export async function discoverHtml(html, baseUrl, userCity = 'مشهد') {
  const res = await fetch(`${base}/v1/filing-feed/discover-html`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ html, baseUrl, userCity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`discover-html: ${JSON.stringify(data)}`);
  return data;
}

export async function siteMap(entryUrl, userCity = 'مشهد') {
  const res = await fetch(`${base}/v1/filing-feed/site-map`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ entryUrl, userCity, maxVisits: 18, asyncJob: false }),
    signal: AbortSignal.timeout(180_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`site-map: ${JSON.stringify(data)}`);
  return data;
}

export async function previewExtract(site) {
  const res = await fetch(`${base}/v1/filing-feed/preview`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      siteKey: site.siteKey,
      loginUrl: site.entryUrl || site.listingsUrl,
      listingsUrl: site.listingsUrl,
      username: '',
      password: '',
      siteConfig: site.blueprint || {},
      maxItems: site.maxExtract || 100,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`preview: ${JSON.stringify(data)}`);
  return data;
}

export function extractFixtureOffline(site) {
  const htmlPath = resolve(root, site.fixtureHtml);
  const html = readFileSync(htmlPath, 'utf8');
  const blueprintPath = site.blueprintJson ? resolve(root, site.blueprintJson) : '';
  const py = `
import json, sys
from app.filing_feed.site_indexer import discover_from_html
from app.filing_feed.dom_listing_extractor import extract_listings_from_html
html = open(sys.argv[1], encoding='utf-8').read()
base = sys.argv[2]
bp_path = sys.argv[3]
max_items = int(sys.argv[4]) if sys.argv[4] else None
if bp_path.strip():
    bp = json.load(open(bp_path, encoding='utf-8'))
else:
    bp = discover_from_html(html, base, 'مشهد')['blueprint']
rows = extract_listings_from_html(html, base, bp, max_items=max_items)
print(json.dumps({'ok': bool(rows), 'listings': rows, 'blueprint': bp}, ensure_ascii=False))
`;
  const venvPy = resolve(estateDir, '.venv/bin/python');
  const pyBin = existsSync(venvPy) ? venvPy : 'python3';
  const maxItems = String(site.maxExtract || site.minListings || 100);
  const r = spawnSync(
    pyBin,
    ['-c', py, htmlPath, site.listingsUrl, blueprintPath, maxItems],
    { cwd: estateDir, env: { ...process.env, PYTHONPATH: '.' }, encoding: 'utf8' }
  );
  if (r.status !== 0) throw new Error(`offline extract: ${r.stderr}`);
  return JSON.parse(r.stdout.trim());
}

export function mergeBlueprint(existing, discovered) {
  const bp = { ...(existing || {}), ...(discovered || {}) };
  bp.listPage = { ...(existing?.listPage || {}), ...(discovered?.listPage || {}) };
  bp.fieldMap = { ...(existing?.fieldMap || {}), ...(discovered?.fieldMap || {}) };
  if (discovered?.portalMap?.listPages?.length) {
    bp.portalMap = discovered.portalMap;
    const best = discovered.portalMap.listPages[0];
    if (best?.url) {
      bp.listPage.listingsUrl = best.url;
    }
  }
  return bp;
}

export function validateListings(site, listings) {
  const n = listings.length;
  const min = site.minListings ?? 100;
  const issues = [];
  if (n < min) issues.push(`count ${n} < ${min}`);

  const rate = (fn) => (n ? listings.filter(fn).length / n : 0);
  const titleRate = rate((r) => (r.title || '').length >= 6);
  const fileCodeRate = rate((r) => Boolean(r.fileCode || r.externalId));
  const dealTypeRate = rate((r) => Boolean(r.dealType));
  const priceRate = rate((r) => Boolean(r.price || r.deposit || r.monthlyRent));
  const attributeRate = rate((r) =>
    Boolean(r.documentType || r.buildingAge || r.floor || r.totalFloors || r.cabinet)
  );

  if (titleRate < 0.98) issues.push(`title rate ${(titleRate * 100).toFixed(1)}% < 98%`);
  if (fileCodeRate < 0.85) issues.push(`fileCode rate ${(fileCodeRate * 100).toFixed(1)}% < 85%`);
  if (priceRate < 0.7) issues.push(`price rate ${(priceRate * 100).toFixed(1)}% < 70%`);
  if (dealTypeRate < 0.6) issues.push(`dealType rate ${(dealTypeRate * 100).toFixed(1)}% < 60%`);

  const ids = listings.map((r) => String(r.externalId || r.fileCode || '')).filter(Boolean);
  const dup = ids.length - new Set(ids).size;
  if (dup > 0) issues.push(`duplicate externalId: ${dup}`);

  return {
    pass: issues.length === 0,
    issues,
    metrics: {
      count: n,
      titleRate,
      fileCodeRate,
      priceRate,
      dealTypeRate,
      attributeRate,
      duplicates: dup,
    },
  };
}

export function blueprintPathFor(siteKey) {
  return resolve(blueprintDir, `${siteKey}.json`);
}
