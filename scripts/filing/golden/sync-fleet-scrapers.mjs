#!/usr/bin/env node
/** Upsert fleet manifest sites + blueprints into RegionalFilingScraper rows. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadManifest, blueprintPathFor, root } from './fleet-lib.mjs';

const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient();

function computeEvalScore(metrics) {
  if (!metrics || !metrics.count) return 0;
  const w = (metrics.fileCodeRate || 0) * 0.35 + (metrics.titleRate || 0) * 0.25 + (metrics.priceRate || 0) * 0.4;
  return Math.round(w * 1000) / 10;
}

async function main() {
  const manifest = loadManifest();
  const evalReportPath = resolve(root, 'tmp/fleet-eval-report.json');
  let evalByKey = {};
  if (existsSync(evalReportPath)) {
    const report = JSON.parse(readFileSync(evalReportPath, 'utf8'));
    for (const r of report.results || []) {
      evalByKey[r.siteKey] = r;
    }
  }

  let upserted = 0;
  for (const site of manifest.sites) {
    const bpPath = blueprintPathFor(site.siteKey);
    if (!existsSync(bpPath)) {
      console.log(`[SKIP] ${site.siteKey}: no blueprint at ${bpPath}`);
      continue;
    }
    const saved = JSON.parse(readFileSync(bpPath, 'utf8'));
    const blueprint = saved.blueprint;
    if (!blueprint?.listPage?.containerSelector) {
      console.log(`[SKIP] ${site.siteKey}: incomplete blueprint`);
      continue;
    }

    const evalRow = evalByKey[site.siteKey];
    const evalScore = evalRow?.pass ? computeEvalScore(evalRow.metrics) : evalRow?.metrics ? computeEvalScore(evalRow.metrics) : null;

    const listingsUrl = saved.listingsUrl || site.listingsUrl || site.entryUrl;
    const loginUrl = site.entryUrl || listingsUrl;

    const isFixture = site.mode === 'fixture';
    const dbEnabled = !isFixture && site.enabled !== false;

    await db.regionalFilingScraper.upsert({
      where: { siteKey: site.siteKey },
      create: {
        name: site.name || site.siteKey,
        siteKey: site.siteKey,
        enabled: dbEnabled,
        loginUrl,
        listingsUrl,
        username: '',
        passwordEnc: null,
        siteConfigJson: JSON.stringify(blueprint),
        defaultCity: manifest.defaultCity || 'مشهد',
        intervalMinutes: 10,
        jitterMinutes: 4,
        status: evalRow?.pass ? 'ok' : 'idle',
        evalScore,
        lastEvalAt: evalRow ? new Date() : null,
        lastError: evalRow?.pass ? null : evalRow?.issues?.join('; ') || null,
      },
      update: {
        name: site.name || site.siteKey,
        listingsUrl,
        loginUrl,
        enabled: dbEnabled,
        siteConfigJson: JSON.stringify(blueprint),
        evalScore,
        lastEvalAt: evalRow ? new Date() : undefined,
        lastError: evalRow?.pass ? null : evalRow?.issues?.join('; ') || undefined,
        status: evalRow?.pass ? 'ok' : undefined,
      },
    });
    upserted += 1;
    console.log(`[OK] sync ${site.siteKey} evalScore=${evalScore ?? 'n/a'}`);
  }

  console.log(`FLEET DB SYNC: ${upserted} scrapers`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
