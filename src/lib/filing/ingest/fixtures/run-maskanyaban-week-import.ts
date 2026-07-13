/**
 * Batch-import MaskanYaban listings posted within the last N days.
 *
 * Usage:
 *   npm run import:filing-maskanyaban-week
 *   npx tsx src/lib/filing-scrapers/fixtures/run-maskanyaban-week-import.ts --days=7 --batch-size=200 --once
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';
import { fetchFilingFeedScrape } from '@/lib/filing/ingest/estate-scrape-filing-client';
import { importScrapedFilings } from '@/lib/filing/ingest/runner';
import { scraperSiteConfigForEstateScrape } from '@/lib/filing/ingest/scheduler';

const SITE_KEY = 'maskanyaban';
const LOGIN_URL = 'https://maskanyaban.ir/Account/Login';
const LISTINGS_URL = 'https://maskanyaban.ir/estate/all/all/';
const DEFAULT_CITY = 'مشهد';
const PROGRESS_PATH = join(process.cwd(), 'tmp', 'maskanyaban-week-import.json');
const SCRAPE_TIMEOUT_MS = 45 * 60_000;

type WeekImportProgress = {
  startedAt: string;
  updatedAt: string;
  days: number;
  batchSize: number;
  maxBatches: number;
  batchIndex: number;
  totalImported: number;
  totalScraped: number;
  knownExternalIdsCount: number;
  status: 'running' | 'complete' | 'error';
  error?: string | null;
  lastBatch?: {
    scraped: number;
    imported: number;
    extractMethod?: string;
    pagesVisited?: number;
  };
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

function siteConfigForWeekImport(baseJson: string, enrichDetails: boolean): Record<string, unknown> {
  const base = scraperSiteConfigForEstateScrape(baseJson) as Record<string, unknown>;
  if (enrichDetails) return base;
  const detailPage = (base.detailPage as Record<string, unknown> | undefined) ?? {};
  return {
    ...base,
    detailPage: { ...detailPage, enabled: false },
  };
}

function loadProgress(): WeekImportProgress | null {
  if (!existsSync(PROGRESS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf8')) as WeekImportProgress;
  } catch {
    return null;
  }
}

function saveProgress(progress: WeekImportProgress): void {
  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
  writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8');
}

async function loadKnownExternalIds(db: PrismaClient, scraperId: string): Promise<string[]> {
  const rows = await db.regionalFiling.findMany({
    where: { scraperId },
    select: { externalId: true },
  });
  return rows.map((row) => row.externalId).filter(Boolean);
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
      intervalMinutes: 180,
      jitterMinutes: 10,
      status: 'idle',
    },
    update: {
      loginUrl: LOGIN_URL,
      listingsUrl: LISTINGS_URL,
      siteConfigJson: blueprintJson,
      defaultCity: DEFAULT_CITY,
      enabled: true,
    },
  });
}

async function runBatch(input: {
  db: PrismaClient;
  days: number;
  batchSize: number;
  maxBatches: number;
  once: boolean;
  resume: boolean;
  enrichDetails: boolean;
  refreshExisting: boolean;
}): Promise<WeekImportProgress> {
  const prior = input.resume ? loadProgress() : null;
  const scraper = await ensureScraper(input.db);
  const siteConfig = siteConfigForWeekImport(scraper.siteConfigJson, input.enrichDetails);
  const knownExternalIds = input.refreshExisting
    ? undefined
    : await loadKnownExternalIds(input.db, scraper.id);

  const progress: WeekImportProgress = prior ?? {
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: input.days,
    batchSize: input.batchSize,
    maxBatches: input.maxBatches,
    batchIndex: 0,
    totalImported: 0,
    totalScraped: 0,
    knownExternalIdsCount: knownExternalIds?.length ?? 0,
    status: 'running',
    error: null,
  };

  if (prior?.status === 'complete') {
    console.log('[week-import] already complete');
    return prior;
  }

  if (prior?.status === 'error') {
    progress.status = 'running';
    progress.error = null;
  }

  if (progress.batchIndex >= progress.maxBatches) {
    progress.status = 'complete';
    progress.updatedAt = new Date().toISOString();
    saveProgress(progress);
    console.log('[week-import] max batches reached');
    return progress;
  }

  const refreshExisting = hasFlag('refresh-existing');
  console.log(
    `[week-import] batch ${progress.batchIndex + 1}/${progress.maxBatches} · days=${input.days} · known=${knownExternalIds?.length ?? 0} · refresh=${refreshExisting} · details=${input.enrichDetails ? 'on' : 'off'}`
  );

  const scrape = await fetchFilingFeedScrape(
    {
      siteKey: SITE_KEY,
      loginUrl: LOGIN_URL,
      listingsUrl: LISTINGS_URL,
      username: scraper.username ?? '',
      password: '',
      siteConfig,
      maxItems: input.batchSize,
      withinDays: input.days,
      knownExternalIds,
    },
    { timeoutMs: SCRAPE_TIMEOUT_MS }
  );

  if (!scrape.ok) {
    progress.status = 'error';
    progress.error = scrape.error ?? 'scrape failed';
    progress.updatedAt = new Date().toISOString();
    saveProgress(progress);
    throw new Error(progress.error);
  }

  const rows = scrape.listings ?? [];
  console.log(
    `[scrape] ${rows.length} new rows via ${scrape.extractMethod ?? 'unknown'} (within ${input.days}d)`
  );

  let imported = 0;
  if (rows.length) {
    imported = await importScrapedFilings(scraper, rows);
    console.log(`[import] upserted ${imported} filings`);
  }

  progress.batchIndex += 1;
  progress.totalScraped += rows.length;
  progress.totalImported += imported;
  progress.knownExternalIdsCount = (knownExternalIds?.length ?? 0) + rows.length;
  progress.lastBatch = {
    scraped: rows.length,
    imported,
    extractMethod: scrape.extractMethod,
  };
  progress.updatedAt = new Date().toISOString();

  if (rows.length === 0) {
    progress.status = 'complete';
    console.log('[week-import] no new listings in window — done');
  } else if (progress.batchIndex >= progress.maxBatches) {
    progress.status = 'complete';
    console.log('[week-import] reached max batches — stopping');
  } else if (input.once) {
    progress.status = 'running';
    console.log('[week-import] batch complete — more batches remain');
  } else {
    progress.status = 'running';
  }

  saveProgress(progress);
  return progress;
}

async function main() {
  const days = parseArg('days', 7);
  const batchSize = parseArg('batch-size', 200);
  const maxBatches = parseArg('max-batches', 50);
  const once = hasFlag('once');
  const resume = hasFlag('resume') || !hasFlag('reset');
  const enrichDetails = hasFlag('enrich-details');
  const refreshExisting = hasFlag('refresh-existing');
  const db = new PrismaClient();

  try {
    let progress = await runBatch({
      db,
      days,
      batchSize,
      maxBatches,
      once,
      resume,
      enrichDetails,
      refreshExisting,
    });

    while (!once && progress.status === 'running' && progress.batchIndex < maxBatches) {
      progress = await runBatch({
        db,
        days,
        batchSize,
        maxBatches,
        once: false,
        resume: true,
        enrichDetails,
        refreshExisting,
      });
      if ((progress.lastBatch?.scraped ?? 0) === 0) break;
    }

    console.log(
      `[week-import] status=${progress.status} imported=${progress.totalImported} scraped=${progress.totalScraped} batches=${progress.batchIndex}`
    );
    console.log(`[progress] ${PROGRESS_PATH}`);

    if (progress.status === 'error') process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
