/**
 * Re-crawl all MaskanYaban listings in the last N days (upsert list fields) then enrich details.
 *
 * Usage:
 *   npm run import:filing-maskanyaban-refresh
 *   npx tsx src/lib/filing/ingest/fixtures/run-maskanyaban-list-refresh.ts --days=100 --max-items=2500
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';
import { enrichFilingsUntilComplete } from '@/lib/filing/ingest/enrich-pipeline';
import { importScrapedFilings } from '@/lib/filing/ingest/runner';
import { reconcileFilingMetadataForScraper } from '@/lib/filing/ingest/post-import-sync';

const SITE_KEY = 'maskanyaban';
const LOGIN_URL = 'https://maskanyaban.ir/Account/Login';
const LISTINGS_URL = 'https://maskanyaban.ir/estate/all/all/';
const DEFAULT_CITY = 'مشهد';
const PROGRESS_PATH = join(process.cwd(), 'tmp', 'maskanyaban-list-refresh.json');
const BATCH_JSON = join(process.cwd(), 'tmp', 'maskanyaban-list-refresh-batch.json');

type Progress = {
  startedAt: string;
  updatedAt: string;
  days: number;
  scraped: number;
  imported: number;
  enrichRounds: number;
  enrichTotal: number;
  enrichRemaining: number;
  status: 'running' | 'complete' | 'error';
  error?: string | null;
};

function parseArg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function saveProgress(p: Progress): void {
  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), 'utf8');
}

function runPythonCrawl(days: number, maxItems: number, maxPages: number): { count: number; ok: boolean } {
  const estateDir = join(process.cwd(), 'mini-services/estate-scrape');
  const py = join(estateDir, '.venv/bin/python');
  const args = [
    '-m',
    'app.filing_feed.run_maskanyaban_100d_bulk',
    `--within-days=${days}`,
    `--max-items=${maxItems}`,
    `--max-pages=${maxPages}`,
    '--known=',
    `--out=${BATCH_JSON}`,
  ];
  const result = spawnSync(py, args, {
    cwd: estateDir,
    env: { ...process.env, PYTHONPATH: '.' },
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 80 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'python list refresh crawl failed');
  }
  if (result.stdout) process.stdout.write(result.stdout);
  const line = (result.stdout || '').trim().split('\n').pop() || '{}';
  return JSON.parse(line) as { count: number; ok: boolean };
}

async function ensureScraper(db: PrismaClient) {
  const blueprintJson = JSON.stringify(MASKANYABAN_BLUEPRINT);
  return db.regionalFilingScraper.upsert({
    where: { siteKey: SITE_KEY },
    create: {
      name: 'مسکن‌یابان مشهد',
      siteKey: SITE_KEY,
      enabled: true,
      loginUrl: LOGIN_URL,
      listingsUrl: LISTINGS_URL,
      username: '',
      passwordEnc: null,
      siteConfigJson: blueprintJson,
      defaultCity: DEFAULT_CITY,
      defaultCityId: 'mashhad',
      intervalMinutes: 15,
      jitterMinutes: 5,
      status: 'idle',
    },
    update: {
      siteConfigJson: blueprintJson,
      defaultCity: DEFAULT_CITY,
      defaultCityId: 'mashhad',
      enabled: true,
    },
  });
}

async function main(): Promise<void> {
  const days = parseArg('days', 100);
  const maxItems = parseArg('max-items', 2500);
  const maxPages = parseArg('max-pages', 120);
  const enrichLimit = parseArg('enrich-limit', 30);
  const enrichRounds = parseArg('enrich-rounds', 400);
  const skipEnrich = hasFlag('list-only');

  const progress: Progress = {
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days,
    scraped: 0,
    imported: 0,
    enrichRounds: 0,
    enrichTotal: 0,
    enrichRemaining: 0,
    status: 'running',
  };
  saveProgress(progress);

  const db = new PrismaClient();
  try {
    const scraper = await ensureScraper(db);

    console.log(`[list-refresh] crawling last ${days}d · maxItems=${maxItems} · maxPages=${maxPages}`);
    const meta = runPythonCrawl(days, maxItems, maxPages);
    if (!existsSync(BATCH_JSON)) {
      throw new Error('batch json missing after crawl');
    }
    const rows = JSON.parse(readFileSync(BATCH_JSON, 'utf8')) as ScrapedFilingRow[];
    progress.scraped = rows.length;
    console.log(`[list-refresh] scraped ${rows.length} rows (python ok=${meta.ok})`);

    if (rows.length) {
      progress.imported = await importScrapedFilings(scraper, rows);
      console.log(`[list-refresh] upserted ${progress.imported} filings`);
      await reconcileFilingMetadataForScraper(scraper, { withinDays: days, limit: 1000 });
    }

    if (!skipEnrich && rows.length) {
      console.log('[list-refresh] enriching details until queue empty…');
      const enrich = await enrichFilingsUntilComplete(scraper, {
        withinDays: days,
        limit: enrichLimit,
        maxRounds: enrichRounds,
      });
      progress.enrichRounds = enrich.rounds;
      progress.enrichTotal = enrich.totalEnriched;
      progress.enrichRemaining = enrich.remaining;
      console.log(
        `[list-refresh] enrich rounds=${enrich.rounds} total=${enrich.totalEnriched} remaining=${enrich.remaining}`
      );
    }

    progress.status = 'complete';
    progress.updatedAt = new Date().toISOString();
    saveProgress(progress);
    console.log(`[list-refresh] complete → ${PROGRESS_PATH}`);
  } catch (err) {
    progress.status = 'error';
    progress.error = err instanceof Error ? err.message : String(err);
    progress.updatedAt = new Date().toISOString();
    saveProgress(progress);
    throw err;
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
