/**
 * Self-test: intake queue sync-fallback (analyze, listing-copy, assess).
 * Run: npm run test:post-queue-wizard
 */
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

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  await stubServerOnly();

  process.env.NEED_INTAKE_LLM_ENABLED = 'false';
  process.env.INTAKE_QUEUE_SYNC_FALLBACK = 'true';

  const { runPostPipeline } = await import(
    '@/lib/need-intake/fixtures/post-pipeline-harness'
  );
  const { enqueueIntakeQueueSyncFallback } = await import(
    '@/lib/need-intake/intake-queue-sync-fallback'
  );
  const { getIntakeQueueJob } = await import('@/lib/need-intake/intake-queue-store');
  const {
    INTAKE_JOB_ANALYZE,
    INTAKE_JOB_ASSESS,
    INTAKE_JOB_LISTING_COPY,
  } = await import('@/lib/need-intake/intake-queue-types');
  type IntakeAnalyzeJobPayload = import('@/lib/need-intake/intake-queue-types').IntakeAnalyzeJobPayload;
  type IntakeAssessJobResult = import('@/lib/need-intake/intake-run-assess-job').IntakeAssessJobResult;
  type IntakeListingCopyJobResult = import('@/lib/need-intake/intake-run-listing-copy').IntakeListingCopyJobResult;
  type IntakeAnalyzeResponse = import('@/intake/api/intake.dto').IntakeAnalyzeResponse;

  const sample = runPostPipeline({
    needText: '\u0627\u067e\u0627\u0631\u062a\u0645\u0627\u0646 \u062f\u0648 \u062e\u0648\u0627\u0628\u0647 \u062f\u0631 \u0645\u0634\u0647\u062f',
    detailsText:
      '\u062a\u0627 \u0633\u0642\u0641 \u0633\u0631\u0627\u0645\u06cc\u06a9 \u0628\u0627\u0634\u0647 \u06cc\u0643 \u0645\u0644\u06cc\u0627\u0631\u062f \u0631\u0647\u0646 \u062f\u0627\u0631\u0645 \u06f1\u06f0\u06f0 \u0645\u06cc\u0644\u06cc\u0648\u0646 \u0627\u062c\u0627\u0631\u0647',
    categorySlug: 'real-estate',
    subcategorySlug: 'apartment-rent',
    city: '\u0645\u0634\u0647\u062f',
  });

  const draft = sample.draft;
  const analyzeText = draft.sourceText ?? '';

  const analyzeRes = await enqueueIntakeQueueSyncFallback({
    jobName: INTAKE_JOB_ANALYZE,
    payload: { text: analyzeText, cityName: '\u0645\u0634\u0647\u062f' } satisfies IntakeAnalyzeJobPayload,
    idempotencyKey: 'self-test-analyze',
  });
  assert(analyzeRes.syncFallback === true, 'analyze sync fallback');
  const analyzeRecord = getIntakeQueueJob(analyzeRes.jobId);
  assert(analyzeRecord?.status === 'completed', 'analyze completed');
  const analyzeResult = analyzeRecord?.result as IntakeAnalyzeResponse | undefined;
  assert(Boolean(analyzeResult?.draft || analyzeResult?.templateId), 'analyze result');

  const copyRes = await enqueueIntakeQueueSyncFallback({
    jobName: INTAKE_JOB_LISTING_COPY,
    payload: { draft: draft as unknown as Record<string, unknown> },
    idempotencyKey: 'self-test-copy',
  });
  assert(copyRes.syncFallback === true, 'copy sync fallback');
  const copyRecord = getIntakeQueueJob(copyRes.jobId);
  assert(copyRecord?.status === 'completed', 'copy completed');
  const copyResult = copyRecord?.result as IntakeListingCopyJobResult | undefined;
  assert(Boolean(copyResult?.title?.trim()), 'copy title');
  assert(Boolean(copyResult?.description?.trim()), 'copy description');
  assert(Array.isArray(copyRecord?.progressEvents), 'copy progress events');

  const assessRes = await enqueueIntakeQueueSyncFallback({
    jobName: INTAKE_JOB_ASSESS,
    payload: {
      draft: draft as unknown as Record<string, unknown>,
      listingPreview: { title: sample.title, description: sample.description },
      rulesOnly: true,
    },
    idempotencyKey: 'self-test-assess',
  });
  assert(assessRes.syncFallback === true, 'assess sync fallback');
  const assessRecord = getIntakeQueueJob(assessRes.jobId);
  assert(assessRecord?.status === 'completed', 'assess completed');
  const assessResult = assessRecord?.result as IntakeAssessJobResult | undefined;
  assert(Boolean(assessResult?.report), 'assess report');
  assert(typeof assessResult?.report.score === 'number', 'assess score');

  console.log('OK: post-queue-wizard self-test passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
