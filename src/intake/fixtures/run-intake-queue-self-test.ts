/**
 * Phase 46 ? intake queue architecture self-test.
 * Run: npm run test:intake-queue
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildIntakeQueueIdempotencyKey,
  clearIntakeQueueIdempotencyMemory,
  lookupIdempotentJob,
  rememberIdempotentJob,
} from '@/lib/need-intake/intake-queue-idempotency';
import {
  INTAKE_QUEUE_JOB_NAMES,
  INTAKE_QUEUE_LOAD_TARGET_JOBS_PER_MIN,
  INTAKE_QUEUE_MIN_LOAD_CASES,
  INTAKE_QUEUE_V1_TAG,
  allIntakeQueueChecksPass,
} from '@/lib/need-intake/intake-queue-release';
import {
  getIntakeQueueDefaultPriority,
  getIntakeQueueLoadTargetJobsPerMin,
  getIntakeQueuePaidPriority,
  isIntakeQueueSyncFallbackEnabled,
  resolveIntakeQueuePriority,
} from '@/lib/need-intake/intake-queue-policy';
import { clearIntakeQueueJobStore, getIntakeQueueJob } from '@/lib/need-intake/intake-queue-store';
import {
  INTAKE_QUEUE_LOAD_CASES,
  runIntakeQueueLoadCases,
  simulateEnqueueBurst,
} from '@/lib/need-intake/fixtures/intake-queue-load-cases';
import { INTAKE_JOB_ANALYZE } from '@/lib/need-intake/intake-queue-types';
import { buildJobReferenceDraft } from '@/lib/need-intake/verticals/jobs-services-reference';
import { INTAKE_QUALITY_GATE_V1_TAG } from '@/lib/need-intake/intake-quality-gate-release';

const ROOT = join(process.cwd());

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function stubServerOnly(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  } as NodeModule;
}

async function main(): Promise<void> {
  await stubServerOnly();
  const { enqueueIntakeQueueSyncFallback } = await import(
    '@/lib/need-intake/intake-queue-sync-fallback'
  );

  assert(INTAKE_QUEUE_LOAD_CASES.length >= INTAKE_QUEUE_MIN_LOAD_CASES, 'load cases');
  const loadRun = runIntakeQueueLoadCases();
  assert(loadRun.failed.length === 0, `load cases: ${loadRun.failed.join('; ')}`);
  assert(allIntakeQueueChecksPass(loadRun.passed), 'release registry');
  assert(getIntakeQueueLoadTargetJobsPerMin() === INTAKE_QUEUE_LOAD_TARGET_JOBS_PER_MIN, '200/min target');

  // 46.5 idempotency
  const key = buildIntakeQueueIdempotencyKey(INTAKE_JOB_ANALYZE, { text: '\u062E\u0631\u06CC\u062F \u067E\u0698\u0648' });
  rememberIdempotentJob(key, 'job-a');
  assert(lookupIdempotentJob(key) === 'job-a', 'idempotency remember');

  // 46.7 priority
  assert(getIntakeQueuePaidPriority() < getIntakeQueueDefaultPriority(), 'paid priority higher');
  assert(resolveIntakeQueuePriority(true) < resolveIntakeQueuePriority(false), 'paid boost');

  // 46.10 sync fallback
  clearIntakeQueueIdempotencyMemory();
  clearIntakeQueueJobStore();
  process.env.INTAKE_QUEUE_ENABLED = 'false';
  const sync = await enqueueIntakeQueueSyncFallback({
    jobName: INTAKE_JOB_ANALYZE,
    payload: { text: '\u062E\u0631\u06CC\u062F \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u0645\u0634\u0647\u062F' },
  });
  assert(sync.syncFallback === true, 'sync fallback flag');
  assert(sync.status === 'completed', 'sync completed');
  assert(Boolean(getIntakeQueueJob(sync.jobId)?.result), 'sync result stored');
  assert(isIntakeQueueSyncFallbackEnabled(), 'fallback default on');

  // 46.1/46.2 job names
  assert(INTAKE_QUEUE_JOB_NAMES.includes('intake.analyze'), 'analyze job');
  assert(INTAKE_QUEUE_JOB_NAMES.includes('intake.listing-copy'), 'listing-copy job');

  // 46.8 burst simulation
  const burst = simulateEnqueueBurst(200);
  assert(burst.jobsPerMin > 0, 'burst sim');

  // 46.3 worker service (Nest)
  const nestModule = readFileSync(
    join(ROOT, 'mini-services/backend/src/modules/intake-queue/intake-queue.module.ts'),
    'utf8'
  );
  assert(nestModule.includes('intake-analyze'), 'nest analyze queue');
  assert(nestModule.includes('intake-dead-letter'), 'nest dlq');

  // 46.4 API routes
  assert(existsSync(join(ROOT, 'src/app/api/need-intake/queue/enqueue/route.ts')), 'enqueue API');
  assert(existsSync(join(ROOT, 'src/app/api/need-intake/queue/jobs/[jobId]/route.ts')), 'poll API');
  assert(existsSync(join(ROOT, 'src/app/api/need-intake/queue/jobs/[jobId]/stream/route.ts')), 'SSE API');
  assert(existsSync(join(ROOT, 'src/hooks/use-intake-queue-job.ts')), 'queue hook');
  assert(existsSync(join(ROOT, 'src/app/api/internal/intake-queue/execute/route.ts')), 'internal execute');

  // 46.6 DLQ processor
  assert(
    existsSync(join(ROOT, 'mini-services/backend/src/common/processors/intake-dead-letter.processor.ts')),
    'dlq processor'
  );

  // listing-copy sync path
  const draft = buildJobReferenceDraft();
  const { runIntakeListingCopyJob } = await import('@/lib/need-intake/intake-run-listing-copy');
  const copyResult = await runIntakeListingCopyJob(
    { draft: draft as unknown as Record<string, unknown> },
    { stream: false }
  );
  assert(copyResult.title.length > 0, 'listing-copy runner');
  // 46.9 docs
  const doc = readFileSync(join(ROOT, 'docs/INTAKE_QUEUE_ARCHITECTURE.md'), 'utf8');
  assert(doc.includes(INTAKE_QUEUE_V1_TAG), 'architecture doc');
  assert(existsSync(join(ROOT, 'docs/INTAKE_QUEUE_RUNBOOK.md')), 'runbook');

  // phase 45 still referenced
  assert(doc.includes(INTAKE_QUALITY_GATE_V1_TAG), 'quality gate cross-ref');

  console.log(
    JSON.stringify({
      ok: true,
      tag: INTAKE_QUEUE_V1_TAG,
      loadCases: loadRun.passed,
      loadTargetPerMin: loadRun.target,
      syncJobId: sync.jobId,
      burstJobsPerMin: burst.jobsPerMin,
    })
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
