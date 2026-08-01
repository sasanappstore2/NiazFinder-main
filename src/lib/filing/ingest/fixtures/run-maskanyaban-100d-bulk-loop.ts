/**
 * Loop: Python crawl all/all (100d) → import → repeat until no new rows.
 *
 * Usage:
 *   npx tsx src/lib/filing/ingest/fixtures/run-maskanyaban-100d-bulk-loop.ts --days=100
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';
import { importScrapedFilings } from '@/lib/filing/ingest/runner';
import { enrichRegionalFilingsBatch } from '@/lib/filing/ingest/enrich-pipeline';
import { reconcileFilingMetadataForScraper } from '@/lib/filing/ingest/post-import-sync';

const SITE_KEY = 'maskanyaban';
const LOGIN_URL = 'https://maskanyaban.ir/Account/Login';
const LISTINGS_URL = 'https://maskanyaban.ir/estate/all/all/';
const DEFAULT_CITY = 'مشهد';
const PROGRESS_PATH = join(process.cwd(), 'tmp', 'maskanyaban-100d-bulk-loop.json');
const BATCH_JSON = join(process.cwd(), 'tmp', 'maskanyaban-100d-batch.json');

type Progress = {
  startedAt: string;
  updatedAt: string;
  days: number;
  round: number;
  totalImported: number;
  totalScraped: number;
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

function runPythonCrawl(days: number, maxItems: number, known: string[]): { count: number; ok: boolean } {
  const estateDir = join(process.cwd(), 'mini-services/estate-scrape');
  const py = join(estateDir, '.venv/bin/python');
  const args = [
    '-m',
    'app.filing_feed.run_maskanyaban_100d_bulk',
    `--within-days=${days}`,
    `--max-items=${maxItems}`,
    '--max-pages=250',
    `--known=${known.join(',')}`,
    `--out=${BATCH_JSON}`,
  ];
  const result = spawnSync(py, args, {
    cwd: estateDir,
    env: { ...process.env, PYTHONPATH: '.' },
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const stderr = result.stderr || '';
    if (stderr.includes('timed out') || stderr.includes('Timeout')) {
      return { count: 0, ok: false, timedOut: true };
    }
    throw new Error(stderr || 'python bulk crawl failed');
  }
  const line = (result.stdout || '').trim().split('\n').pop() || '{}';
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const parsed = JSON.parse(line) as { count: number; ok: boolean; error?: string | null };
  if (!parsed.ok && parsed.count === 0 && parsed.error?.toLowerCase().includes('timed out')) {
    return { count: 0, ok: false, timedOut: true };
  }
  return parsed;
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
      intervalMinutes: 15,
      jitterMinutes: 5,
      status: 'idle',
    },
    update: { siteConfigJson: blueprintJson, enabled: true },
  });
}

async function loadKnownIds(db: PrismaClient, scraperId: string): Promise<string[]> {
  const rows = await db.regionalFiling.findMany({
    where: { scraperId },
    select: { externalId: true },
  });
  return rows.map((r) => r.externalId).filter(Boolean) as string[];
}

async function main(): Promise<void> {
  const days = parseArg('days', 100);
  const maxItems = parseArg('batch-size', 400);
  const maxRounds = parseArg('max-rounds', 80);
  const resume = !hasFlag('fresh');

  let progress: Progress = {
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days,
    round: 0,
    totalImported: 0,
    totalScraped: 0,
    status: 'running',
  };
  if (resume && existsSync(PROGRESS_PATH)) {
    try {
      progress = { ...progress, ...JSON.parse(readFileSync(PROGRESS_PATH, 'utf8')) };
      if (progress.status === 'complete') {
        console.log('[bulk-loop] already complete');
        return;
      }
      progress.status = 'running';
      progress.error = null;
    } catch {
      /* fresh */
    }
  }

  const db = new PrismaClient();
  try {
    const scraper = await ensureScraper(db);

    while (progress.round < maxRounds) {
      progress.round += 1;
      const known = await loadKnownIds(db, scraper.id);
      console.log(`[bulk-loop] round ${progress.round}/${maxRounds} · known=${known.length}`);

      const meta = runPythonCrawl(days, maxItems, known);
      if (meta.timedOut || (!meta.ok && meta.count === 0)) {
        console.log('[bulk-loop] crawl timeout — retrying round after pause');
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      if (!existsSync(BATCH_JSON)) {
        throw new Error('batch json missing');
      }
      const rows = JSON.parse(readFileSync(BATCH_JSON, 'utf8')) as ScrapedFilingRow[];
      console.log(`[bulk-loop] scraped ${rows.length} new (python ok=${meta.ok})`);

      if (!rows.length) {
        progress.status = 'complete';
        progress.updatedAt = new Date().toISOString();
        saveProgress(progress);
        console.log('[bulk-loop] no new listings — done');
        break;
      }

      const imported = await importScrapedFilings(scraper, rows);
      progress.totalScraped += rows.length;
      progress.totalImported += imported;
      progress.updatedAt = new Date().toISOString();
      saveProgress(progress);
      console.log(`[bulk-loop] imported ${imported} (total ${progress.totalImported})`);

      try {
        await reconcileFilingMetadataForScraper(scraper, { withinDays: days, limit: 500 });
        const enrich = await enrichRegionalFilingsBatch(scraper, {
          withinDays: days,
          limit: 20,
          minCompleteness: 75,
        });
        console.log(
          `[bulk-loop] post-import enrich=${enrich.enriched} skipped=${enrich.skipped}`
        );
      } catch (postErr) {
        console.warn('[bulk-loop] post-import enrich skipped:', postErr);
      }
    }

    if (progress.round >= maxRounds && progress.status === 'running') {
      progress.status = 'complete';
      saveProgress(progress);
      console.log('[bulk-loop] max rounds reached');
    }

    console.log(
      `[bulk-loop] final: rounds=${progress.round} scraped=${progress.totalScraped} imported=${progress.totalImported}`
    );
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
