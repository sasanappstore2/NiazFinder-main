/**
 * Backfill MaskanYaban detail enrichment for existing regional filings.
 *
 * Usage:
 *   npm run import:filing-maskanyaban-backfill
 *   npx tsx src/lib/filing/ingest/fixtures/run-maskanyaban-detail-backfill.ts --limit=25 --until-empty --within-days=100
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';
import {
  enrichFilingsUntilComplete,
  enrichRegionalFilingsBatch,
} from '@/lib/filing/ingest/enrich-pipeline';
import { countFilingsNeedingEnrich } from '@/lib/filing/ingest/post-import-sync';

const SITE_KEY = 'maskanyaban';
const PROGRESS_PATH = join(process.cwd(), 'tmp', 'maskanyaban-detail-backfill.json');

type BackfillProgress = {
  startedAt: string;
  updatedAt: string;
  totalEnriched: number;
  totalSkipped: number;
  batches: number;
  remaining: number;
  status: 'running' | 'complete' | 'error';
  lastErrors: string[];
  error?: string | null;
};

function parseArg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseStringArg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=').trim() || undefined : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function loadProgress(): BackfillProgress | null {
  if (!existsSync(PROGRESS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf8')) as BackfillProgress;
  } catch {
    return null;
  }
}

function saveProgress(progress: BackfillProgress): void {
  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
  writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8');
}

async function ensureScraper(db: PrismaClient) {
  const blueprintJson = JSON.stringify(MASKANYABAN_BLUEPRINT);
  return db.regionalFilingScraper.upsert({
    where: { siteKey: SITE_KEY },
    create: {
      name: 'مسکن‌یابان مشهد',
      siteKey: SITE_KEY,
      enabled: true,
      loginUrl: 'https://maskanyaban.ir/Account/Login',
      listingsUrl: 'https://maskanyaban.ir/estate/all/all/',
      username: '',
      passwordEnc: null,
      siteConfigJson: blueprintJson,
      defaultCity: 'مشهد',
      defaultCityId: 'mashhad',
      intervalMinutes: 15,
      jitterMinutes: 5,
      status: 'idle',
    },
    update: {
      siteConfigJson: blueprintJson,
      enabled: true,
      defaultCityId: 'mashhad',
    },
  });
}

async function main() {
  const db = new PrismaClient();
  const limit = parseArg('limit', 25);
  const maxBatches = parseArg('max-batches', 500);
  const delayMs = parseArg('delay-ms', 800);
  const minCompleteness = parseArg('min-completeness', 75);
  const withinDays = hasFlag('all-time') ? undefined : parseArg('within-days', 100);
  const fileCode = parseStringArg('file-code');
  const concurrency = parseArg('concurrency', 6);
  const once = hasFlag('once');
  const untilEmpty = hasFlag('until-empty');

  const scraper = await ensureScraper(db);
  const prev = hasFlag('fresh') ? null : loadProgress();
  const progress: BackfillProgress = {
    startedAt: prev?.startedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalEnriched: prev?.totalEnriched ?? 0,
    totalSkipped: prev?.totalSkipped ?? 0,
    batches: prev?.batches ?? 0,
    remaining: 0,
    status: 'running',
    lastErrors: [],
  };
  saveProgress(progress);

  console.log(
    `[detail-backfill] scraper=${scraper.id} limit=${limit} withinDays=${withinDays ?? 'all'} untilEmpty=${untilEmpty}`
  );

  try {
    if (untilEmpty && !fileCode && !once) {
      const result = await enrichFilingsUntilComplete(scraper, {
        withinDays,
        limit,
        maxRounds: maxBatches,
        minCompleteness,
        delayMs,
        concurrency,
      });
      progress.batches = result.rounds;
      progress.totalEnriched += result.totalEnriched;
      progress.totalSkipped += result.totalSkipped;
      progress.remaining = result.remaining;
      progress.updatedAt = new Date().toISOString();
      saveProgress(progress);
      console.log(
        `[detail-backfill] until-empty · rounds=${result.rounds} enriched=${result.totalEnriched} remaining=${result.remaining}`
      );
    } else {
      let batch = 0;
      while (batch < maxBatches) {
        batch += 1;
        const result = await enrichRegionalFilingsBatch(scraper, {
          limit: fileCode ? 1 : limit,
          minCompleteness,
          fileCode,
          delayMs,
          withinDays,
          concurrency,
        });

        progress.batches = batch;
        progress.totalEnriched += result.enriched;
        progress.totalSkipped += result.skipped;
        progress.lastErrors = result.errors.slice(0, 10);
        progress.remaining =
          (await countFilingsNeedingEnrich(scraper.id, { withinDays, minCompleteness, phase: 'first' })) +
          (await countFilingsNeedingEnrich(scraper.id, { withinDays, minCompleteness, phase: 'reenrich' }));
        progress.updatedAt = new Date().toISOString();
        saveProgress(progress);

        console.log(
          `[detail-backfill] batch ${batch}: enriched=${result.enriched} skipped=${result.skipped} remaining=${progress.remaining}`
        );

        if (fileCode || once || (result.enriched === 0 && result.errors.length === 0)) {
          break;
        }
        if (result.enriched === 0 && result.skipped === 0) break;
      }
    }

    progress.status = 'complete';
    progress.updatedAt = new Date().toISOString();
    saveProgress(progress);
    console.log(
      `[detail-backfill] complete · enriched=${progress.totalEnriched} skipped=${progress.totalSkipped} remaining=${progress.remaining}`
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
