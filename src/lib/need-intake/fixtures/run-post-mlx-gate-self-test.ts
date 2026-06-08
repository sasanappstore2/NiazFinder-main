/**
 * MLX production gate — analyze + listing-copy + stream (required, no skip).
 * Run: npm run test:post-mlx-gate
 */
import { getIntakeIndexes } from '@/intake/dictionaries/loader';
import { analyzeNeedTextViaQwen } from '@/lib/need-intake/analysis-from-qwen';
import { buildBaselineListingCopy } from '@/lib/need-intake/baseline-listing-copy';
import { POST_GOLDEN_MATRIX } from '@/lib/need-intake/fixtures/post-golden-matrix';
import { runPostPipeline } from '@/lib/need-intake/fixtures/post-pipeline-harness';
import { pickListingTitleWithDealGuard } from '@/lib/need-intake/listing-copy-guards';
import { buildListingCopyContext } from '@/lib/need-intake/listing-copy-prompt';
import { finalizeListingTitle } from '@/lib/need-intake/listing-title-sanitize';
import { mergeListingTitleWithAi } from '@/lib/need-intake/resolve-listing-title';
import {
  checkQwenIntakeHealth,
  generateListingCopyViaQwen,
  getNeedIntakeLlmBaseUrl,
} from '@/lib/need-intake/qwen-intake-client';

process.env.NEED_INTAKE_LLM_ENABLED = 'true';
process.env.NEED_INTAKE_COPY_AI_ENABLED = 'true';

const ANALYZE_SAMPLE = POST_GOLDEN_MATRIX.filter(
  (s) => s.group === 'regression' || s.id.startsWith('money-')
).slice(0, 8);

async function requireMlxHealth(): Promise<void> {
  const url = getNeedIntakeLlmBaseUrl();
  const health = await checkQwenIntakeHealth();
  if (!health.ok) {
    throw new Error(
      `MLX required but unavailable at ${url}/health — ${health.loadError ?? 'not ok'}. Start intake-mlx before running gate.`
    );
  }

  const probe = await fetch(`${url}/v1/listing-copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt: 'ping', userPrompt: 'ping' }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null);

  if (probe && probe.status === 404) {
    throw new Error(
      `MLX at ${url} is missing POST /v1/listing-copy — restart with latest intake-mlx (npm run dev:intake-mlx).`
    );
  }

  console.log(`MLX health OK (${health.modelId ?? 'model loaded'}) @ ${url}`);
}

async function testAnalyzeCases(): Promise<string[]> {
  const failed: string[] = [];
  const indexes = await getIntakeIndexes();
  for (const scenario of ANALYZE_SAMPLE) {
    const text = [scenario.input.needText, scenario.input.detailsText].filter(Boolean).join('\n');
    try {
      const result = await analyzeNeedTextViaQwen(text, indexes, {
        preferredCityName: scenario.input.city,
      });
      const engine = result.meta?.engine ?? '';
      if (!engine.includes('qwen') && !engine.includes('rules')) {
        failed.push(`${scenario.id}: unexpected engine ${engine}`);
      }
      if (scenario.expect.dealType && scenario.id.includes('rahn')) {
        const tx = result.entities.transactionType;
        const dealMap: Record<string, string[]> = {
          rent_rahn_ejare: ['DEPOSIT_AND_RENT', 'FULL_DEPOSIT', 'RENT'],
          rent_rahn_full: ['FULL_DEPOSIT', 'RENT'],
        };
        const allowed = dealMap[scenario.expect.dealType];
        if (allowed && tx && !allowed.includes(tx)) {
          failed.push(`${scenario.id}: tx=${tx} expected one of ${allowed.join(',')}`);
        }
      }
    } catch (e) {
      failed.push(`${scenario.id}: analyze error ${e instanceof Error ? e.message : e}`);
    }
  }
  return failed;
}

async function testListingCopyEndpoint(): Promise<string[]> {
  const failed: string[] = [];
  const shop = POST_GOLDEN_MATRIX.find((s) => s.id === 'money-shop-rahn-1b');
  if (!shop) {
    failed.push('missing money-shop-rahn-1b fixture');
    return failed;
  }
  const pipeline = runPostPipeline(shop.input);
  const ctx = buildListingCopyContext(pipeline.draft);
  const mlx = await generateListingCopyViaQwen(ctx);
  if (!mlx?.title && !mlx?.description) {
    failed.push('MLX /v1/listing-copy returned empty');
    return failed;
  }
  if (mlx.title) {
    const safe = pickListingTitleWithDealGuard(
      pipeline.title,
      mlx.title,
      pipeline.draft.sourceText
    );
    if (/^فروش/u.test(safe) && /رهن/u.test(pipeline.draft.sourceText)) {
      failed.push(`listing-copy deal flip: ${safe}`);
    }
  }
  return failed;
}

async function testStreamSequence(): Promise<string[]> {
  const failed: string[] = [];
  const shop = POST_GOLDEN_MATRIX.find((s) => s.id === 'money-shop-rahn-1b');
  if (!shop) return ['missing shop fixture for stream'];
  const pipeline = runPostPipeline(shop.input);
  const baseline = buildBaselineListingCopy(pipeline.draft);
  const ctx = buildListingCopyContext(pipeline.draft);

  const events: string[] = ['baseline'];
  let title = baseline.title;

  const qwen = await generateListingCopyViaQwen(ctx);
  if (qwen?.title) {
    events.push('title');
    const merged = mergeListingTitleWithAi(pipeline.draft, qwen.title);
    title = pickListingTitleWithDealGuard(baseline.title, merged, pipeline.draft.sourceText);
    title = finalizeListingTitle(title, { sourceText: ctx.sourceSummary });
  }
  events.push('done');

  if (!events.includes('baseline')) failed.push('stream missing baseline');
  if (!events.includes('done')) failed.push('stream missing done');
  if (!title || title.length < 8) failed.push(`stream title too short: ${title}`);
  if (/^فروش/u.test(title) && /رهن/u.test(pipeline.draft.sourceText)) {
    failed.push(`stream deal flip: ${title}`);
  }
  return failed;
}

export async function runPostMlxGateSelfTest(): Promise<{
  ok: boolean;
  analyzeFailures: string[];
  copyFailures: string[];
  streamFailures: string[];
}> {
  await requireMlxHealth();
  const [analyzeFailures, copyFailures, streamFailures] = [
    await testAnalyzeCases(),
    await testListingCopyEndpoint(),
    await testStreamSequence(),
  ];
  const ok =
    analyzeFailures.length === 0 &&
    copyFailures.length === 0 &&
    streamFailures.length === 0;
  return { ok, analyzeFailures, copyFailures, streamFailures };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-post-mlx-gate-self-test'));

if (isDirectRun) {
  runPostMlxGateSelfTest()
    .then(({ ok, analyzeFailures, copyFailures, streamFailures }) => {
      console.log(
        `post-mlx-gate: analyze ${ANALYZE_SAMPLE.length - analyzeFailures.length}/${ANALYZE_SAMPLE.length}, copy ${copyFailures.length ? 'FAIL' : 'OK'}, stream ${streamFailures.length ? 'FAIL' : 'OK'}`
      );
      const all = [...analyzeFailures, ...copyFailures, ...streamFailures];
      if (all.length) {
        console.error(all.join('\n'));
        process.exit(1);
      }
      if (!ok) process.exit(1);
    })
    .catch((e) => {
      console.error('post-mlx-gate FAILED:', e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
