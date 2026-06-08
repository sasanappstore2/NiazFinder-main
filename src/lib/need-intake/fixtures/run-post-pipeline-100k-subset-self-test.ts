/**
 * Post pipeline eval on estate 100k JSONL subset (deal + title invariants).
 *
 * Run:
 *   npm run test:post-pipeline-100k:smoke   # 1_000
 *   npm run test:post-pipeline-100k         # 5_000 default
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { REAL_ESTATE_100K_JSONL } from '@/lib/need-intake/dataset/build-real-estate-100k-dataset';
import { iterateJsonlFixtures } from '@/lib/need-intake/prefill/load-jsonl-fixtures';
import {
  assertTitleExpertReadable,
  draftMoneySnapshot,
  runPostPipeline,
} from '@/lib/need-intake/fixtures/post-pipeline-harness';

process.env.NEED_INTAKE_LLM_ENABLED = 'false';

const args = new Set(process.argv.slice(2));
const smoke = args.has('--smoke');
const limitArg = [...args].find((a) => a.startsWith('--limit='));
const limit = smoke
  ? 1_000
  : limitArg
    ? Number.parseInt(limitArg.split('=')[1] ?? '', 10)
    : 5_000;

const MIN_PASS_RATE = smoke ? 0.82 : 0.8;
const REPORT_PATH = join(
  process.cwd(),
  'data',
  'need-intake-training',
  smoke ? 'post-pipeline-100k-smoke-report.json' : 'post-pipeline-100k-report.json'
);

function fixtureToPostInput(text: string, labels?: Record<string, unknown>) {
  const city = typeof labels?.city === 'string' ? labels.city : '';
  const categorySlug =
    typeof labels?.categorySlug === 'string' ? labels.categorySlug : undefined;
  const subcategorySlug =
    typeof labels?.subcategorySlug === 'string' ? labels.subcategorySlug : undefined;
  return {
    needText: text,
    city,
    categorySlug,
    subcategorySlug,
  };
}

export async function runPostPipeline100kSubset(options?: {
  limit?: number;
  jsonlPath?: string;
  minPassRate?: number;
}): Promise<{
  total: number;
  passed: number;
  passRate: number;
  failureBuckets: Record<string, number>;
}> {
  const jsonlPath = options?.jsonlPath ?? REAL_ESTATE_100K_JSONL;
  const maxCases = options?.limit ?? limit;
  const minRate = options?.minPassRate ?? MIN_PASS_RATE;

  let total = 0;
  let passed = 0;
  const failureBuckets: Record<string, number> = {};
  const started = Date.now();

  for await (const fixture of iterateJsonlFixtures(jsonlPath)) {
    if (total >= maxCases) break;
    total += 1;

    const input = fixtureToPostInput(
      fixture.input,
      fixture.labels as unknown as Record<string, unknown> | undefined
    );
    const result = runPostPipeline(input);
    const money = draftMoneySnapshot(result.draft);
    const errs: string[] = [];

    if (!result.title || result.title.length < 8) errs.push('title too short');
    const titleErr = assertTitleExpertReadable(result);
    if (titleErr) errs.push(titleErr);

    const labelDeal = (fixture.labels as { dealType?: string })?.dealType;
    if (labelDeal && money.dealType && money.dealType !== labelDeal) {
      errs.push(`deal mismatch ${money.dealType} vs ${labelDeal}`);
    }

    if (errs.length) {
      const key = errs[0] ?? 'unknown';
      failureBuckets[key] = (failureBuckets[key] ?? 0) + 1;
    } else {
      passed += 1;
    }

    if (total % 1_000 === 0) {
      console.log(
        `… post-pipeline 100k ${total} (${((passed / total) * 100).toFixed(1)}% pass)`
      );
    }
  }

  const passRate = total ? passed / total : 1;
  const report = {
    generatedAt: new Date().toISOString(),
    jsonlPath,
    total,
    passed,
    passRate,
    minPassRate: minRate,
    elapsedMs: Date.now() - started,
    failureBuckets,
  };

  mkdirSync(join(process.cwd(), 'data', 'need-intake-training'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Wrote ${REPORT_PATH}`);

  if (passRate < minRate) {
    throw new Error(
      `post-pipeline 100k subset pass rate ${(passRate * 100).toFixed(2)}% < ${(minRate * 100).toFixed(0)}%`
    );
  }

  return { total, passed, passRate, failureBuckets };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-post-pipeline-100k-subset-self-test'));

if (isDirectRun) {
  runPostPipeline100kSubset({ limit })
    .then(({ total, passed, passRate }) => {
      console.log(
        `post-pipeline-100k: ${passed}/${total} (${(passRate * 100).toFixed(2)}%) OK`
      );
    })
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
