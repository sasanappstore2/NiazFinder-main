#!/usr/bin/env node
/**
 * MaskanYaban E2E gate — no login scrape + import + report + public /f page.
 * Exit 0 = pass, 1 = fail (for CI / agent loops).
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const REPORT = join(ROOT, 'tmp', 'maskanyaban-50-report.json');
const MAX_ITEMS = process.env.MASKANYABAN_E2E_MAX ?? '10';
const VERIFY = process.env.MASKANYABAN_E2E_VERIFY ?? MAX_ITEMS;
const APP_URL = process.env.NIAZFINDER_URL ?? 'http://127.0.0.1:3000';
const SCRAPE_URL = process.env.ESTATE_SCRAPE_URL ?? 'http://127.0.0.1:8200';

function fail(msg) {
  console.error(`[e2e-gate] FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[e2e-gate] OK: ${msg}`);
}

async function health() {
  for (const [name, url] of [
    ['estate-scrape', `${SCRAPE_URL}/docs`],
    ['app', APP_URL],
  ]) {
    const res = await fetch(url, { signal: AbortSignal.timeout(name === 'app' ? 20000 : 8000) }).catch(() => null);
    if (!res?.ok) fail(`${name} not reachable at ${url}`);
    ok(`${name} up (${res.status})`);
  }
}

function runCrawl() {
  execSync(
    `npx --yes tsx src/lib/filing-scrapers/fixtures/run-maskanyaban-live-crawl.ts --max-items=${MAX_ITEMS} --verify-sample=${VERIFY}`,
    { cwd: ROOT, stdio: 'inherit', env: process.env }
  );
}

function readReport() {
  if (!existsSync(REPORT)) fail(`report missing: ${REPORT}`);
  return JSON.parse(readFileSync(REPORT, 'utf8'));
}

function assertReport(report) {
  const critical = ['fileCode', 'dealType', 'propertyKind', 'area', 'location'];
  for (const field of critical) {
    const pct = report.coverage?.[field]?.pct ?? 0;
    if (pct < 95) fail(`${field} coverage ${pct}% < 95%`);
  }

  const sample = report.verification?.sample ?? 0;
  const failCount = report.verification?.fail ?? 0;
  const maxFail = Math.floor(sample * 0.1);
  if (failCount > maxFail) {
    fail(`verification ${report.verification?.ok}/${sample} (issues: ${(report.verification?.issues ?? []).slice(0, 3).join('; ')})`);
  }

  const matrix = report.dealKindMatrix ?? {};
  if (Object.keys(matrix).length === 0) fail('dealKindMatrix empty — categorization not detected');
  ok(`categorization matrix: ${JSON.stringify(matrix)}`);
  ok(`verification ${report.verification?.ok}/${sample}`);
}

async function assertPublicPage() {
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    const row = await db.regionalFiling.findFirst({
      where: { sourceSite: 'maskanyaban', status: 'active' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, fileCode: true, title: true },
    });
    if (!row) fail('no active maskanyaban filing in DB');
    const res = await fetch(`${APP_URL}/f/${row.id}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) fail(`/f/${row.id} returned ${res.status}`);
    const html = await res.text();
    if (!html.includes(String(row.fileCode ?? '').slice(0, 3)) && !html.includes('فروش') && !html.includes('رهن')) {
      fail(`/f/${row.id} missing expected listing content`);
    }
    ok(`public /f/${row.id} (${row.title}) without login`);
  } finally {
    await db.$disconnect();
  }
}

await health();
runCrawl();
assertReport(readReport());
await assertPublicPage();
console.log('[e2e-gate] PASS — maskanyaban automation healthy');
