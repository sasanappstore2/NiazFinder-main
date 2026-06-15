/**
 * Human-like /post wizard stress test — real HTTP against dev server.
 *
 * Simulates: need → analyze → location draft → listing copy → assess
 *
 * Run (dev server must be up):
 *   INTAKE_STRESS_TEST_BYPASS_RATE_LIMIT=true npm run test:post-human-stress-1k
 *
 * Options:
 *   --runs=1000   --seed=42   --concurrency=3
 *   --base-url=http://127.0.0.1:3000
 *   --use-queue   force queue enqueue path
 */
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  generateHumanPostScenarios,
  type HumanPostScenario,
} from '@/lib/need-intake/fixtures/human-post-stress-generator';
import {
  assertTitleExpertReadable,
  runPostPipeline,
} from '@/lib/need-intake/fixtures/post-pipeline-harness';
import type { NeedDraft } from '@/contracts/need-intake';
import {
  INTAKE_JOB_ANALYZE,
  INTAKE_JOB_ASSESS,
  INTAKE_JOB_LISTING_COPY,
} from '@/lib/need-intake/intake-queue-types';

const STRESS_HEADER = { 'X-Intake-Stress-Test': '1' };

type FailureBucket =
  | 'analyze_http'
  | 'analyze_500'
  | 'analyze_empty'
  | 'copy_http'
  | 'copy_500'
  | 'copy_empty'
  | 'assess_http'
  | 'assess_500'
  | 'assess_empty'
  | 'title_invalid'
  | 'publish_invalid'
  | 'timeout'
  | 'server_error_message';

interface RunFailure {
  id: string;
  vertical: string;
  bucket: FailureBucket;
  message: string;
  city?: string;
  categorySlug?: string;
}

interface StressReport {
  startedAt: string;
  finishedAt?: string;
  baseUrl: string;
  runs: number;
  seed: number;
  concurrency: number;
  useQueue: boolean;
  ok: number;
  failed: number;
  warnings: number;
  passRate: number;
  buckets: Record<string, number>;
  warningBuckets: Record<string, number>;
  failures: RunFailure[];
  warningsList: RunFailure[];
  latenciesMs: { analyze: number[]; copy: number[]; assess: number[] };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (key: string, fallback: string) => {
    const hit = args.find((a) => a.startsWith(`--${key}=`));
    return hit ? hit.split('=')[1] ?? fallback : fallback;
  };
  return {
    runs: Number.parseInt(get('runs', '1000'), 10),
    seed: Number.parseInt(get('seed', '42'), 10),
    concurrency: Number.parseInt(get('concurrency', '3'), 10),
    baseUrl: get('base-url', process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, ''),
    useQueue: args.includes('--use-queue') || process.env.NEXT_PUBLIC_INTAKE_WIZARD_USE_QUEUE === 'true',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function humanDelay(minMs = 300, maxMs = 1200): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs));
  return sleep(ms);
}

function isServerErrorMessage(msg: string): boolean {
  return (
    /\u062E\u0637\u0627\u06CC \u0633\u0631\u0648\u0631|\u062E\u0637\u0627 \u062F\u0631|\u062A\u062D\u0644\u06CC\u0644 \u0647\u0648\u0634\u0645\u0646\u062F|\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u0633\u0631\u0648\u06CC\u0633|server error|internal/i.test(
      msg
    )
  );
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; data: T; rawText: string }> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...STRESS_HEADER, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const rawText = await res.text();
  let data = {} as T;
  try {
    data = JSON.parse(rawText) as T;
  } catch {
    // non-json
  }
  return { ok: res.ok, status: res.status, data, rawText };
}

async function watchQueueStream<T>(
  streamUrl: string,
  timeoutMs: number
): Promise<{ ok: boolean; result?: T; error?: string }> {
  const res = await fetch(streamUrl, {
    headers: STRESS_HEADER,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok || !res.body) {
    return { ok: false, error: `stream status ${res.status}` };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (const line of buffer.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      try {
        const evt = JSON.parse(raw) as { type: string; result?: T; message?: string };
        if (evt.type === 'result') return { ok: true, result: evt.result };
        if (evt.type === 'error') return { ok: false, error: evt.message ?? 'job error' };
      } catch {
        // skip
      }
    }
    buffer = buffer.split('\n').pop() ?? '';
  }
  return { ok: false, error: 'stream ended without result' };
}

async function enqueueJob(
  baseUrl: string,
  jobName: string,
  payload: Record<string, unknown>,
  idempotencyKey: string
) {
  return fetchJson<{ jobId: string; streamUrl?: string; status?: string; result?: unknown }>(
    `${baseUrl}/api/need-intake/queue/enqueue`,
    {
      method: 'POST',
      body: JSON.stringify({ jobName, payload, idempotencyKey }),
    },
    180_000
  );
}

async function runAnalyze(
  baseUrl: string,
  scenario: HumanPostScenario,
  useQueue: boolean
): Promise<{ ok: boolean; bucket?: FailureBucket; message?: string; ms: number }> {
  const started = performance.now();
  const text = scenario.combinedText;
  const cityName = scenario.city;

  if (useQueue) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const enq = await enqueueJob(
        baseUrl,
        INTAKE_JOB_ANALYZE,
        { text, cityName },
        `stress-analyze-${scenario.id}-${attempt}`
      );
      if (enq.status === 429 || enq.rawText.includes('\u062A\u0639\u062F\u0627\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A')) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!enq.ok) {
        return {
          ok: false,
          bucket: enq.status >= 500 ? 'analyze_500' : 'analyze_http',
          message: enq.rawText.slice(0, 200),
          ms: performance.now() - started,
        };
      }
      if (enq.data.status === 'completed' && enq.data.result) {
        return { ok: true, ms: performance.now() - started };
      }
      if (enq.data.streamUrl) {
        const watched = await watchQueueStream(enq.data.streamUrl, 180_000);
        if (!watched.ok) {
          return {
            ok: false,
            bucket: isServerErrorMessage(watched.error ?? '') ? 'server_error_message' : 'analyze_empty',
            message: watched.error,
            ms: performance.now() - started,
          };
        }
        return { ok: true, ms: performance.now() - started };
      }
      break;
    }
  }

  const res = await fetchJson<{ entities?: Record<string, unknown>; error?: string }>(
    `${baseUrl}/api/intake/analyze`,
    { method: 'POST', body: JSON.stringify({ text, cityName }) },
    180_000
  );
  const ms = performance.now() - started;
  if (!res.ok) {
    return {
      ok: false,
      bucket: res.status >= 500 ? 'analyze_500' : 'analyze_http',
      message: (res.data as { error?: string }).error ?? res.rawText.slice(0, 200),
      ms,
    };
  }
  const errMsg = (res.data as { error?: string }).error;
  if (errMsg && isServerErrorMessage(errMsg)) {
    return { ok: false, bucket: 'server_error_message', message: errMsg, ms };
  }
  return { ok: true, ms };
}

async function runListingCopy(
  baseUrl: string,
  draft: NeedDraft,
  scenarioId: string,
  useQueue: boolean
): Promise<{ ok: boolean; bucket?: FailureBucket; message?: string; title?: string; ms: number }> {
  const started = performance.now();

  if (useQueue) {
    const enq = await enqueueJob(
      baseUrl,
      INTAKE_JOB_LISTING_COPY,
      { draft: draft as unknown as Record<string, unknown> },
      `stress-copy-${scenarioId}`
    );
    if (!enq.ok) {
      return {
        ok: false,
        bucket: enq.status >= 500 ? 'copy_500' : 'copy_http',
        message: enq.rawText.slice(0, 200),
        ms: performance.now() - started,
      };
    }
    if (enq.data.status === 'completed' && enq.data.result) {
      const r = enq.data.result as { title?: string };
      return { ok: Boolean(r.title?.trim()), title: r.title, ms: performance.now() - started };
    }
    if (enq.data.streamUrl) {
      const watched = await watchQueueStream<{ title?: string; description?: string }>(
        enq.data.streamUrl,
        180_000
      );
      if (!watched.ok) {
        return {
          ok: false,
          bucket: isServerErrorMessage(watched.error ?? '') ? 'server_error_message' : 'copy_empty',
          message: watched.error,
          ms: performance.now() - started,
        };
      }
      return {
        ok: Boolean(watched.result?.title?.trim()),
        title: watched.result?.title,
        ms: performance.now() - started,
      };
    }
  }

  const res = await fetch(`${baseUrl}/api/need-intake/preview-listing/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...STRESS_HEADER },
    body: JSON.stringify({ draft }),
    signal: AbortSignal.timeout(180_000),
  });
  const body = await res.text();
  const ms = performance.now() - started;
  if (!res.ok) {
    return {
      ok: false,
      bucket: res.status >= 500 ? 'copy_500' : 'copy_http',
      message: body.slice(0, 200),
      ms,
    };
  }
  let title: string | undefined;
  for (const line of body.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const ev = JSON.parse(line.slice(6)) as { type?: string; title?: string };
      if (ev.type === 'done' || ev.type === 'title') title = ev.title ?? title;
    } catch {
      // skip
    }
  }
  return { ok: Boolean(title?.trim()), title, ms };
}

async function runAssess(
  baseUrl: string,
  draft: NeedDraft,
  title: string,
  description: string,
  scenarioId: string,
  useQueue: boolean
): Promise<{ ok: boolean; bucket?: FailureBucket; message?: string; ms: number }> {
  const started = performance.now();
  const listingPreview = { title, description, qualityScore: 0.7 };

  if (useQueue) {
    const enq = await enqueueJob(
      baseUrl,
      INTAKE_JOB_ASSESS,
      {
        draft: draft as unknown as Record<string, unknown>,
        listingPreview,
      },
      `stress-assess-${scenarioId}`
    );
    if (!enq.ok) {
      return {
        ok: false,
        bucket: enq.status >= 500 ? 'assess_500' : 'assess_http',
        message: enq.rawText.slice(0, 200),
        ms: performance.now() - started,
      };
    }
    if (enq.data.status === 'completed' && enq.data.result) {
      return { ok: true, ms: performance.now() - started };
    }
    if (enq.data.streamUrl) {
      const watched = await watchQueueStream(enq.data.streamUrl, 180_000);
      if (!watched.ok) {
        return {
          ok: false,
          bucket: isServerErrorMessage(watched.error ?? '') ? 'server_error_message' : 'assess_empty',
          message: watched.error,
          ms: performance.now() - started,
        };
      }
      return { ok: true, ms: performance.now() - started };
    }
  }

  const res = await fetchJson<{ report?: unknown; error?: string }>(
    `${baseUrl}/api/intake/assess`,
    {
      method: 'POST',
      body: JSON.stringify({ draft, listingPreview }),
    },
    180_000
  );
  const ms = performance.now() - started;
  if (!res.ok) {
    return {
      ok: false,
      bucket: res.status >= 500 ? 'assess_500' : 'assess_http',
      message: (res.data as { error?: string }).error ?? res.rawText.slice(0, 200),
      ms,
    };
  }
  return { ok: Boolean((res.data as { report?: unknown }).report), ms };
}

async function runOneScenario(
  baseUrl: string,
  scenario: HumanPostScenario,
  useQueue: boolean,
  report: StressReport
): Promise<void> {
  try {
    await humanDelay(200, 800);

    const analyze = await runAnalyze(baseUrl, scenario, useQueue);
    report.latenciesMs.analyze.push(Math.round(analyze.ms));
    if (!analyze.ok) {
      report.failures.push({
        id: scenario.id,
        vertical: scenario.vertical,
        bucket: analyze.bucket!,
        message: analyze.message ?? 'analyze failed',
        city: scenario.city,
        categorySlug: scenario.categorySlug,
      });
      return;
    }

    await humanDelay(400, 1000);

    const pipeline = runPostPipeline({
      needText: scenario.needText,
      detailsText: scenario.detailsText,
      categorySlug: scenario.categorySlug,
      subcategorySlug: scenario.subcategorySlug,
      city: scenario.city,
      neighborhood: scenario.neighborhood,
      userDealType: scenario.userDealType,
    });
    const draft = pipeline.draft;

    const titleErr = assertTitleExpertReadable(pipeline, { minLength: 5, skipSanitize: true });
    if (titleErr) {
      report.failures.push({
        id: scenario.id,
        vertical: scenario.vertical,
        bucket: 'title_invalid',
        message: titleErr,
        city: scenario.city,
        categorySlug: scenario.categorySlug,
      });
      return;
    }

    if (!pipeline.publishValid && scenario.vertical === 'real-estate') {
      report.warnings += 1;
      report.warningsList.push({
        id: scenario.id,
        vertical: scenario.vertical,
        bucket: 'publish_invalid',
        message: pipeline.publishErrors.join('; '),
        city: scenario.city,
        categorySlug: scenario.categorySlug,
      });
    }

    await humanDelay(500, 1200);

    const copy = await runListingCopy(baseUrl, draft, scenario.id, useQueue);
    report.latenciesMs.copy.push(Math.round(copy.ms));
    if (!copy.ok) {
      report.failures.push({
        id: scenario.id,
        vertical: scenario.vertical,
        bucket: copy.bucket ?? 'copy_empty',
        message: copy.message ?? 'copy failed',
        city: scenario.city,
        categorySlug: scenario.categorySlug,
      });
      return;
    }

    await humanDelay(600, 1500);

    const title = copy.title ?? pipeline.title;
    const assess = await runAssess(baseUrl, draft, title, pipeline.description, scenario.id, useQueue);
    report.latenciesMs.assess.push(Math.round(assess.ms));
    if (!assess.ok) {
      report.failures.push({
        id: scenario.id,
        vertical: scenario.vertical,
        bucket: assess.bucket ?? 'assess_empty',
        message: assess.message ?? 'assess failed',
        city: scenario.city,
        categorySlug: scenario.categorySlug,
      });
      return;
    }

    report.ok += 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report.failures.push({
      id: scenario.id,
      vertical: scenario.vertical,
      bucket: /timeout|aborted/i.test(msg) ? 'timeout' : 'server_error_message',
      message: msg,
      city: scenario.city,
      categorySlug: scenario.categorySlug,
    });
  }
}

async function poolRun<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)]!;
}

async function main(): Promise<void> {
  const { runs, seed, concurrency, baseUrl, useQueue } = parseArgs();
  const scenarios = generateHumanPostScenarios({ count: runs, seed });

  const reportDir = join(process.cwd(), 'data', 'need-intake-training');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, 'post-human-stress-1k-report.json');
  const logPath = join(reportDir, 'post-human-stress-1k-live.log');

  const report: StressReport = {
    startedAt: new Date().toISOString(),
    baseUrl,
    runs,
    seed,
    concurrency,
    useQueue,
    ok: 0,
    failed: 0,
    warnings: 0,
    passRate: 0,
    buckets: {},
    warningBuckets: {},
    failures: [],
    warningsList: [],
    latenciesMs: { analyze: [], copy: [], assess: [] },
  };

  console.log(`post-human-stress: ${runs} runs @ ${baseUrl} queue=${useQueue} concurrency=${concurrency} seed=${seed}`);

  const health = await fetch(`${baseUrl}/api/need-intake/publish`, {
    method: 'OPTIONS',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!health) {
    console.error(`Dev server not reachable at ${baseUrl}. Start: npm run dev`);
    process.exit(1);
  }

  let completed = 0;
  await poolRun(scenarios, concurrency, async (scenario) => {
    await runOneScenario(baseUrl, scenario, useQueue, report);
    completed += 1;
    if (completed % 25 === 0 || completed === runs) {
      report.failed = report.failures.length;
      report.passRate = runs ? Math.round((report.ok / completed) * 1000) / 10 : 0;
      const line = `[${completed}/${runs}] ok=${report.ok} fail=${report.failures.length} pass=${report.passRate}%`;
      console.log(line);
      appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`);
    }
  });

  report.failed = report.failures.length;
  report.passRate = runs ? Math.round((report.ok / runs) * 1000) / 10 : 0;
  report.finishedAt = new Date().toISOString();

  for (const f of report.failures) {
    report.buckets[f.bucket] = (report.buckets[f.bucket] ?? 0) + 1;
  }
  for (const w of report.warningsList) {
    report.warningBuckets[w.bucket] = (report.warningBuckets[w.bucket] ?? 0) + 1;
  }

  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n--- post-human-stress summary ---');
  console.log(`OK: ${report.ok}/${runs} (${report.passRate}%)`);
  console.log(`Failures: ${report.failed} | Warnings: ${report.warnings}`);
  console.log('Failure buckets:', report.buckets);
  if (report.warnings > 0) console.log('Warning buckets:', report.warningBuckets);
  console.log(
    `Latency p95 analyze=${percentile(report.latenciesMs.analyze, 95)}ms copy=${percentile(report.latenciesMs.copy, 95)}ms assess=${percentile(report.latenciesMs.assess, 95)}ms`
  );
  console.log(`Report: ${reportPath}`);

  if (report.failures.length > 0) {
    console.log('\nFirst 10 failures:');
    for (const f of report.failures.slice(0, 10)) {
      console.log(`  [${f.bucket}] ${f.id} (${f.vertical}): ${f.message}`);
    }
  }

  process.exit(report.passRate >= 95 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
