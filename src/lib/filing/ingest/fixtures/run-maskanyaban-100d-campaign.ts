/**
 * 100-day MaskanYaban campaign: matrix harvest → bulk import → detail backfill → coverage audit.
 *
 * Prerequisites: docker compose up (postgres), estate-scrape on :8200 for bulk import phase.
 *
 * Usage:
 *   npm run import:filing-maskanyaban-100d
 *   npx tsx src/lib/filing/ingest/fixtures/run-maskanyaban-100d-campaign.ts --days=100 --matrix-only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const CAMPAIGN_PROGRESS = join(process.cwd(), 'tmp', 'maskanyaban-100d-campaign.json');

type CampaignPhase = 'matrix' | 'bulk-import' | 'list-refresh' | 'backfill' | 'reconcile' | 'audit' | 'complete';

type CampaignProgress = {
  startedAt: string;
  updatedAt: string;
  days: number;
  phase: CampaignPhase;
  matrixImported?: number;
  bulkBatches?: number;
  backfillBatches?: number;
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

function loadProgress(): CampaignProgress | null {
  if (!existsSync(CAMPAIGN_PROGRESS)) return null;
  try {
    return JSON.parse(readFileSync(CAMPAIGN_PROGRESS, 'utf8')) as CampaignProgress;
  } catch {
    return null;
  }
}

function saveProgress(progress: CampaignProgress): void {
  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
  writeFileSync(CAMPAIGN_PROGRESS, JSON.stringify(progress, null, 2), 'utf8');
}

function runNpmScript(script: string, extraArgs: string[] = []): void {
  const result = spawnSync('npm', ['run', script, '--', ...extraArgs], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed (exit ${result.status ?? 'unknown'})`);
  }
}

function runTsx(scriptPath: string, args: string[]): void {
  const result = spawnSync('npx', ['--yes', 'tsx', scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${scriptPath} failed (exit ${result.status ?? 'unknown'})`);
  }
}

async function main(): Promise<void> {
  const days = parseArg('days', 100);
  const maxPerCell = parseArg('max-per-cell', 40);
  const bulkBatches = parseArg('bulk-batches', 80);
  const backfillRounds = parseArg('backfill-rounds', 20);
  const backfillLimit = parseArg('backfill-limit', 25);
  const matrixOnly = hasFlag('matrix-only');
  const skipMatrix = hasFlag('skip-matrix');
  const resume = !hasFlag('fresh');

  const prior = resume ? loadProgress() : null;
  const progress: CampaignProgress =
    prior && resume
      ? prior
      : {
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          days,
          phase: skipMatrix ? 'bulk-import' : 'matrix',
          status: 'running',
          error: null,
        };

  if (prior?.status === 'complete') {
    console.log('[100d-campaign] already complete');
    return;
  }

  try {
    if (!skipMatrix && progress.phase === 'matrix') {
      console.log('\n=== Phase 1: matrix harvest (15 cells) ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-matrix-harvest.ts', [
        `--within-days=${days}`,
        `--max-per-cell=${maxPerCell}`,
        '--import',
      ]);
      progress.phase = matrixOnly ? 'complete' : 'bulk-import';
      progress.updatedAt = new Date().toISOString();
      saveProgress(progress);
      if (matrixOnly) {
        progress.status = 'complete';
        saveProgress(progress);
        console.log('[100d-campaign] matrix-only complete');
        return;
      }
    }

    if (progress.phase === 'bulk-import') {
      console.log('\n=== Phase 2: bulk import (all/all, enriched) ===');
      let batches = 0;
      while (batches < bulkBatches) {
        runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-week-import.ts', [
          `--days=${days}`,
          '--batch-size=200',
          '--max-batches=1',
          '--once',
          '--resume',
          '--enrich-details',
        ]);
        batches += 1;
        progress.bulkBatches = batches;
        progress.updatedAt = new Date().toISOString();
        saveProgress(progress);

        const weekProgressPath = join(process.cwd(), 'tmp', 'maskanyaban-week-import.json');
        if (existsSync(weekProgressPath)) {
          const week = JSON.parse(readFileSync(weekProgressPath, 'utf8')) as { status?: string };
          if (week.status === 'complete') break;
        }
      }
      progress.phase = 'list-refresh';
      saveProgress(progress);
    }

    if (progress.phase === 'list-refresh') {
      console.log('\n=== Phase 2b: list refresh (full window upsert) ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-list-refresh.ts', [
        `--days=${days}`,
        '--max-items=2500',
        '--list-only',
      ]);
      progress.phase = 'backfill';
      saveProgress(progress);
    }

    if (progress.phase === 'backfill') {
      console.log('\n=== Phase 3: detail backfill (until empty) ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-detail-backfill.ts', [
        `--within-days=${days}`,
        '--limit=30',
        '--until-empty',
        '--min-completeness=75',
      ]);
      progress.phase = 'reconcile';
      saveProgress(progress);
    }

    if (progress.phase === 'reconcile') {
      console.log('\n=== Phase 4: metadata reconcile ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-reconcile.ts', [`--days=${days}`]);
      progress.phase = 'audit';
      saveProgress(progress);
    }

    if (progress.phase === 'audit') {
      console.log('\n=== Phase 4: coverage audit ===');
      runNpmScript('audit:filing-coverage', [`--days=${days}`]);
      progress.phase = 'complete';
      progress.status = 'complete';
      progress.updatedAt = new Date().toISOString();
      saveProgress(progress);
      console.log('\n[100d-campaign] complete — see tmp/filing-coverage-report.json');
    }
  } catch (err) {
    progress.status = 'error';
    progress.error = err instanceof Error ? err.message : String(err);
    progress.updatedAt = new Date().toISOString();
    saveProgress(progress);
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
