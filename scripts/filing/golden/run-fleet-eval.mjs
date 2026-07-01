#!/usr/bin/env node
/** Fleet eval: extract 100 listings per site, validate, auto-fix blueprint (max 3 retries). */
import { readFileSync, existsSync } from 'node:fs';
import {
  loadManifest,
  discoverHtml,
  previewExtract,
  extractFixtureOffline,
  validateListings,
  mergeBlueprint,
  saveJson,
  blueprintPathFor,
  reportPath,
  root,
} from './fleet-lib.mjs';

const MAX_RETRIES = 3;

function loadBlueprint(site) {
  const p = blueprintPathFor(site.siteKey);
  if (existsSync(p)) {
    const saved = JSON.parse(readFileSync(p, 'utf8'));
    return { blueprint: saved.blueprint, listingsUrl: saved.listingsUrl || site.listingsUrl };
  }
  if (site.blueprintJson) {
    return {
      blueprint: JSON.parse(readFileSync(`${root}/${site.blueprintJson}`, 'utf8')),
      listingsUrl: site.listingsUrl,
    };
  }
  return { blueprint: site.blueprint || null, listingsUrl: site.listingsUrl };
}

async function extractWithBlueprint(site, blueprint, listingsUrl) {
  const ctx = { ...site, blueprint, listingsUrl };
  if (site.mode === 'fixture') {
    return extractFixtureOffline(ctx);
  }
  return previewExtract(ctx);
}

async function tryFixBlueprint(site, blueprint, listingsUrl) {
  if (site.mode !== 'fixture') return blueprint;
  const html = readFileSync(`${root}/${site.fixtureHtml}`, 'utf8');
  const discovered = await discoverHtml(html, listingsUrl, 'مشهد');
  return mergeBlueprint(blueprint, discovered.blueprint);
}

async function evalSite(site) {
  let { blueprint, listingsUrl } = loadBlueprint(site);
  if (!blueprint) {
    return { siteKey: site.siteKey, pass: false, error: 'no blueprint — run fleet onboard first' };
  }

  let lastValidation = null;
  let listings = [];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await extractWithBlueprint(site, blueprint, listingsUrl);
      listings = result.listings || [];
      if (result.blueprint && site.mode === 'fixture') {
        blueprint = result.blueprint;
      }
      lastValidation = validateListings(site, listings);
      if (lastValidation.pass) {
        const score =
          (lastValidation.metrics.fileCodeRate || 0) * 35 +
          (lastValidation.metrics.titleRate || 0) * 25 +
          (lastValidation.metrics.priceRate || 0) * 40;
        return {
          siteKey: site.siteKey,
          pass: true,
          attempts: attempt,
          metrics: lastValidation.metrics,
          evalScore: Math.round(score * 10) / 10,
          extractMethod: site.mode === 'fixture' ? 'dom+public+fixture' : 'dom+public',
          sampleCount: listings.length,
        };
      }
      if (attempt < MAX_RETRIES) {
        blueprint = await tryFixBlueprint(site, blueprint, listingsUrl);
        saveJson(blueprintPathFor(site.siteKey), {
          siteKey: site.siteKey,
          listingsUrl,
          blueprint,
          fixedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      lastValidation = {
        pass: false,
        issues: [err instanceof Error ? err.message : String(err)],
        metrics: {},
      };
    }
  }

  return {
    siteKey: site.siteKey,
    pass: false,
    attempts: MAX_RETRIES,
    issues: lastValidation?.issues || ['unknown'],
    metrics: lastValidation?.metrics || {},
    sampleCount: listings.length,
  };
}

async function main() {
  const manifest = loadManifest();
  const enabled = manifest.sites.filter((s) => s.enabled !== false);
  const results = [];

  for (const site of enabled) {
    console.log(`Eval ${site.siteKey}...`);
    const r = await evalSite(site);
    results.push(r);
    if (r.pass) {
      console.log(`[PASS] ${site.siteKey}: n=${r.sampleCount} attempts=${r.attempts}`);
    } else {
      console.error(`[FAIL] ${site.siteKey}: ${(r.issues || [r.error]).join('; ')}`);
    }
  }

  saveJson(reportPath, { results, at: new Date().toISOString() });
  console.log(`Report: ${reportPath}`);

  const failed = results.filter((r) => !r.pass);
  if (failed.length) process.exit(1);
  console.log('FLEET EVAL PASSED');

  try {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync('node', ['scripts/filing-portal/sync-fleet-scrapers.mjs'], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    if (r.status !== 0) {
      console.warn('[fleet] DB sync skipped or failed (run npm run filing-fleet:sync-db manually)');
    }
  } catch {
    /* optional when DB unavailable */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
