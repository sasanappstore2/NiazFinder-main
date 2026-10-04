/**
 * Self-test for the golden dataset — CCQS §1.1/§11 (`PLAN/ccqs-architecture.md`). Validates every
 * entry against the schema, checks caseId uniqueness, and checks every regression-tagged case has
 * a non-generic `reason` (a golden case with no real reason is not trustworthy ground truth).
 *
 * Run via: npm run test:ccqs-golden-dataset
 */
import { GOLDEN_DATASET_V1 } from '@/ccqs/golden-dataset';
import { goldenCaseSchema } from '@/ccqs/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function testAllEntriesValid(): string[] {
  const errors: string[] = [];
  for (const c of GOLDEN_DATASET_V1) {
    const result = goldenCaseSchema.safeParse(c);
    if (!result.success) errors.push(fail(c.caseId ?? '?', result.error.message));
  }
  return errors;
}

function testCaseIdsUnique(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const c of GOLDEN_DATASET_V1) {
    if (seen.has(c.caseId)) errors.push(fail('unique', `duplicate caseId: ${c.caseId}`));
    seen.add(c.caseId);
  }
  return errors;
}

function testEveryCaseHasReason(): string[] {
  const errors: string[] = [];
  for (const c of GOLDEN_DATASET_V1) {
    if (!c.reason || c.reason.trim().length < 10) {
      errors.push(fail(c.caseId, 'reason is missing or too short to be meaningful ground truth justification'));
    }
  }
  return errors;
}

function testMinimumSize(): string[] {
  const errors: string[] = [];
  if (GOLDEN_DATASET_V1.length < 30) errors.push(fail('size', `expected at least 30 cases, got ${GOLDEN_DATASET_V1.length}`));
  return errors;
}

function testP3RegressionGuardsPresent(): string[] {
  const errors: string[] = [];
  const p3Guards = GOLDEN_DATASET_V1.filter((c) => c.tags.includes('p3-regression-guard'));
  if (p3Guards.length === 0) errors.push(fail('p3-guards', 'no p3-regression-guard cases found'));
  const motorcycleGuards = p3Guards.filter((c) => c.expectedCategory === 'motorcycle');
  if (motorcycleGuards.length === 0) errors.push(fail('p3-guards', 'no motorcycle-expected p3-regression-guard cases found'));
  const sparePartsGuard = GOLDEN_DATASET_V1.find((c) => c.caseId === 'inv-27');
  if (sparePartsGuard?.expectedCategory !== 'spare-parts') errors.push(fail('p3-guards', 'spare-parts collision guard (inv-27) missing or wrong'));
  return errors;
}

export function runGoldenDatasetSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testAllEntriesValid,
    testCaseIdsUnique,
    testEveryCaseHasReason,
    testMinimumSize,
    testP3RegressionGuardsPresent,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun = typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-golden-dataset-self-test'));

if (isDirectRun) {
  const { passed, failed } = runGoldenDatasetSelfTest();
  if (failed.length) {
    console.error('Golden dataset self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`Golden dataset self-test OK: ${passed}/5 (${GOLDEN_DATASET_V1.length} cases)`);
}
