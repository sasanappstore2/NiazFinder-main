/**
 * Rules-only prefill eval on 100k real-estate JSONL.
 *
 * Run:
 *   npm run test:prefill-100k:smoke   # first 1_000
 *   npm run test:prefill-100k         # full 100_000
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { REAL_ESTATE_100K_JSONL } from '@/lib/need-intake/dataset/build-real-estate-100k-dataset';
import { iterateJsonlFixtures } from '@/lib/need-intake/prefill/load-jsonl-fixtures';
import { runRulesPrefillPipeline } from '@/lib/need-intake/prefill/prefill-orchestrator';

process.env.NEED_INTAKE_LLM_ENABLED = 'false';

const args = new Set(process.argv.slice(2));
const smoke = args.has('--smoke');
const limitArg = [...args].find((a) => a.startsWith('--limit='));
const limit = smoke
  ? 1_000
  : limitArg
    ? Number.parseInt(limitArg.split('=')[1] ?? '', 10)
    : undefined;

const MIN_PASS_RATE = smoke ? 0.88 : 0.85;
const REPORT_PATH = join(
  process.cwd(),
  'data',
  'need-intake-training',
  smoke ? 'prefill-100k-smoke-report.json' : 'prefill-100k-report.json'
);

export async function runPrefill100kSelfTest(options?: {
  limit?: number;
  jsonlPath?: string;
  minPassRate?: number;
}): Promise<{
  total: number;
  passed: number;
  passRate: number;
  failureBuckets: Record<string, number>;
  sampleFailures: string[];
}> {
  const jsonlPath = options?.jsonlPath ?? REAL_ESTATE_100K_JSONL;
  const maxCases = options?.limit;
  const minRate = options?.minPassRate ?? MIN_PASS_RATE;

  let total = 0;
  let passed = 0;
  const failureBuckets: Record<string, number> = {};
  const sampleFailures: string[] = [];

  const started = Date.now();
  for await (const fixture of iterateJsonlFixtures(jsonlPath)) {
    if (maxCases != null && total >= maxCases) break;

    const result = runRulesPrefillPipeline(fixture.input, fixture.labels, {
      captured: fixture.meta?.source === 'captured',
    });
    total += 1;
    if (result.pass) {
      passed += 1;
    } else {
      const reasons = [...result.labelErrors, ...result.listingErrors];
      if (result.coverage < 0.45) {
        reasons.push(`low coverage ${(result.coverage * 100).toFixed(0)}%`);
      }
      const primary = reasons[0] ?? 'unknown';
      failureBuckets[primary] = (failureBuckets[primary] ?? 0) + 1;
      if (sampleFailures.length < 40) {
        sampleFailures.push(
          `${fixture.id}: ${reasons.slice(0, 3).join(' | ')} :: ${fixture.input.slice(0, 80)}`
        );
      }
    }

    if (total % 5_000 === 0) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      console.log(
        `… ${total} cases (${passed} pass, ${((passed / total) * 100).toFixed(1)}%) — ${elapsed}s`
      );
    }
  }

  const passRate = total ? passed / total : 1;
  const report = {
    generatedAt: new Date().toISOString(),
    jsonlPath,
    total,
    passed,
    failed: total - passed,
    passRate,
    minPassRate: minRate,
    elapsedMs: Date.now() - started,
    failureBuckets,
    sampleFailures,
  };

  mkdirSync(join(process.cwd(), 'data', 'need-intake-training'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\nPrefill 100k: ${passed}/${total} passed (${(passRate * 100).toFixed(2)}%)`);
  console.log(`Report → ${REPORT_PATH}`);

  if (passRate < minRate) {
    console.error(`Below minimum pass rate ${(minRate * 100).toFixed(0)}%`);
    const top = Object.entries(failureBuckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    console.error('Top failures:', top);
  }

  return { total, passed, passRate, failureBuckets, sampleFailures };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-prefill-100k-self-test'));

if (isDirectRun) {
  runPrefill100kSelfTest({ limit })
    .then(({ total, passRate }) => {
      const min = smoke ? 0.88 : 0.85;
      process.exit(passRate >= min && total > 0 ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
