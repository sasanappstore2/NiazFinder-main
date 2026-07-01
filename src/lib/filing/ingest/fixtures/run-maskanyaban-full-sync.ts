/**
 * Full MaskanYaban sync: discover new → refresh 100d list → enrich all details → reconcile → audit.
 *
 * Prerequisites: postgres + estate-scrape on :8200
 *
 * Usage:
 *   npm run import:filing-maskanyaban-full-sync
 *   npx tsx src/lib/filing/ingest/fixtures/run-maskanyaban-full-sync.ts --days=100
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROGRESS_PATH = join(process.cwd(), 'tmp', 'maskanyaban-full-sync.json');

type Phase =
  | 'matrix'
  | 'bulk-discovery'
  | 'list-refresh'
  | 'detail-enrich'
  | 'reconcile'
  | 'audit'
  | 'complete';

type Progress = {
  startedAt: string;
  updatedAt: string;
  days: number;
  phase: Phase;
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

function loadProgress(): Progress | null {
  if (!existsSync(PROGRESS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf8')) as Progress;
  } catch {
    return null;
  }
}

function saveProgress(p: Progress): void {
  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), 'utf8');
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

function runNpm(script: string, args: string[] = []): void {
  const result = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed (exit ${result.status ?? 'unknown'})`);
  }
}

async function main(): Promise<void> {
  const days = parseArg('days', 100);
  const skipMatrix = hasFlag('skip-matrix');
  const skipBulk = hasFlag('skip-bulk');
  const resume = !hasFlag('fresh');

  const prior = resume ? loadProgress() : null;
  if (prior?.status === 'complete') {
    console.log('[full-sync] already complete');
    return;
  }

  const progress: Progress =
    prior && resume
      ? prior
      : {
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          days,
          phase: skipMatrix ? (skipBulk ? 'list-refresh' : 'bulk-discovery') : 'matrix',
          status: 'running',
          error: null,
        };

  try {
    if (!skipMatrix && progress.phase === 'matrix') {
      console.log('\n=== Phase 1: matrix harvest (deal × kind cells) ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-matrix-harvest.ts', [
        `--within-days=${days}`,
        '--max-per-cell=60',
        '--import',
      ]);
      progress.phase = skipBulk ? 'list-refresh' : 'bulk-discovery';
      saveProgress({ ...progress, updatedAt: new Date().toISOString() });
    }

    if (!skipBulk && progress.phase === 'bulk-discovery') {
      console.log('\n=== Phase 2: bulk discovery (new listings) ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-100d-bulk-loop.ts', [
        `--days=${days}`,
        '--batch-size=400',
        '--max-rounds=60',
        '--fresh',
      ]);
      progress.phase = 'list-refresh';
      saveProgress({ ...progress, updatedAt: new Date().toISOString() });
    }

    if (progress.phase === 'list-refresh') {
      console.log('\n=== Phase 3: list refresh (full window upsert) ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-list-refresh.ts', [
        `--days=${days}`,
        '--max-items=2500',
        '--max-pages=120',
        '--list-only',
      ]);
      progress.phase = 'detail-enrich';
      saveProgress({ ...progress, updatedAt: new Date().toISOString() });
    }

    if (progress.phase === 'detail-enrich') {
      console.log('\n=== Phase 4: detail enrich until complete ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-detail-backfill.ts', [
        `--within-days=${days}`,
        '--limit=30',
        '--until-empty',
        '--min-completeness=75',
      ]);
      progress.phase = 'reconcile';
      saveProgress({ ...progress, updatedAt: new Date().toISOString() });
    }

    if (progress.phase === 'reconcile') {
      console.log('\n=== Phase 5: metadata reconcile (category + neighborhood) ===');
      runTsx('src/lib/filing/ingest/fixtures/run-maskanyaban-reconcile.ts', [`--days=${days}`]);
      progress.phase = 'audit';
      saveProgress({ ...progress, updatedAt: new Date().toISOString() });
    }

    if (progress.phase === 'audit') {
      console.log('\n=== Phase 6: coverage audit ===');
      runNpm('audit:filing-coverage', [`--days=${days}`]);
      progress.phase = 'complete';
      progress.status = 'complete';
      progress.updatedAt = new Date().toISOString();
      saveProgress(progress);
      console.log('\n[full-sync] complete — see tmp/filing-coverage-report.json');
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
