#!/usr/bin/env node
/** Onboard filing fleet: site-map / discover-html → save blueprints per site. */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  loadManifest,
  discoverHtml,
  siteMap,
  saveJson,
  blueprintPathFor,
  blueprintDir,
  root,
  base,
  estateDir,
} from './fleet-lib.mjs';

function discoverFixtureOffline(htmlPath, baseUrl, userCity) {
  const py = `
import json, sys
from app.filing_feed.site_indexer import discover_from_html
html = open(sys.argv[1], encoding='utf-8').read()
print(json.dumps(discover_from_html(html, sys.argv[2], sys.argv[3]), ensure_ascii=False))
`;
  const venvPy = `${estateDir}/.venv/bin/python`;
  const pyBin = existsSync(venvPy) ? venvPy : 'python3';
  const r = spawnSync(pyBin, ['-c', py, htmlPath, baseUrl, userCity], {
    cwd: estateDir,
    env: { ...process.env, PYTHONPATH: '.' },
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout.trim());
}

async function onboardSite(site, userCity) {
  const outPath = blueprintPathFor(site.siteKey);
  let blueprint = null;
  let listingsUrl = site.listingsUrl;
  let skipped = false;
  let skipReason = site.skipReason || null;

  if (site.enabled === false && site.mode === 'live' && !process.env.FILING_FLEET_ONBOARD_LIVE) {
    skipped = true;
    saveJson(outPath, {
      siteKey: site.siteKey,
      listingsUrl,
      skipped: true,
      skipReason: skipReason || 'غیرفعال — FILING_FLEET_ONBOARD_LIVE=1 برای site-map زنده',
      blueprint: null,
      onboardedAt: new Date().toISOString(),
    });
    return { siteKey: site.siteKey, listingsUrl, blueprint: null, path: outPath, skipped: true };
  }

  if (site.mode === 'fixture') {
    const htmlPath = `${root}/${site.fixtureHtml}`;
    if (!existsSync(htmlPath)) throw new Error(`missing fixture ${htmlPath}`);
    const html = readFileSync(htmlPath, 'utf8');
    if (site.blueprintJson) {
      blueprint = JSON.parse(readFileSync(`${root}/${site.blueprintJson}`, 'utf8'));
    } else {
      try {
        const discovered = await discoverHtml(html, site.listingsUrl, userCity);
        blueprint = discovered.blueprint;
      } catch {
        const discovered = discoverFixtureOffline(htmlPath, site.listingsUrl, userCity);
        blueprint = discovered.blueprint;
      }
    }
  } else {
    const mapped = await siteMap(site.entryUrl, userCity);
    blueprint = mapped.blueprint;
    listingsUrl = mapped.listingsUrl || mapped.bestListUrl || listingsUrl;
  }

  saveJson(outPath, {
    siteKey: site.siteKey,
    listingsUrl,
    blueprint,
    onboardedAt: new Date().toISOString(),
  });

  return { siteKey: site.siteKey, listingsUrl, blueprint, path: outPath };
}

async function main() {
  const manifest = loadManifest();
  const sites = manifest.sites;
  if (!sites.length) {
    console.log('No sites in fleet manifest');
    process.exit(0);
  }

  console.log(`Fleet onboard: ${sites.length} sites (${sites.filter((s) => s.enabled !== false).length} enabled) via ${base}`);
  const results = [];

  for (const site of sites) {
    try {
      const r = await onboardSite(site, manifest.defaultCity || 'مشهد');
      results.push({ ...r, ok: !r.skipped });
      if (r.skipped) {
        console.log(`[SKIP] onboard ${site.siteKey}: ${r.skipReason || 'disabled'}`);
      } else {
        console.log(`[OK] onboard ${site.siteKey} → ${r.path}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ siteKey: site.siteKey, ok: false, error: msg });
      console.error(`[FAIL] onboard ${site.siteKey}: ${msg}`);
    }
  }

  saveJson(`${blueprintDir}/onboard-report.json`, { results, at: new Date().toISOString() });
  const failed = results.filter((r) => r.ok === false && !r.skipped);
  if (failed.length) process.exit(1);
  console.log(`FLEET ONBOARD COMPLETE (${results.length} sites, ${results.filter((r) => r.skipped).length} skipped)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
