/**
 * Self-test for evaluateGate — CCQS §6 (`PLAN/ccqs-architecture.md`).
 * Run via: npm run test:ccqs-gate
 */
import { evaluateGate } from '@/ccqs/gate/evaluate-gate';
import { DEFAULT_GATE_POLICY } from '@/ccqs/gate/default-gate-policy';
import type { QualityMetricSnapshot } from '@/ccqs/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function metrics(overrides: Partial<QualityMetricSnapshot>): QualityMetricSnapshot {
  return {
    replayRunId: 'r1',
    computedAt: 't',
    totalCases: 10,
    categoryAccuracy: 0.95,
    locationAccuracy: 0.95,
    intentAccuracy: null,
    ambiguousRate: 0.05,
    falsePositiveRate: 0.02,
    falseNegativeRate: 0.02,
    confidenceHistogramByField: {},
    ontologyRefinementStats: [],
    ruleCoverage: { totalUniqueRulesMatched: 5, zeroCandidateCaseIds: [] },
    statusCountsByField: {},
    ...overrides,
  };
}

function testPassWhenAboveThresholds(): string[] {
  const errors: string[] = [];
  const verdict = evaluateGate(metrics({}), DEFAULT_GATE_POLICY, { replayRunId: 'r1', decidedAt: 't' });
  if (verdict.verdict !== 'pass') errors.push(fail('pass', `verdict=${verdict.verdict}, reasons=${JSON.stringify(verdict.reasons)}`));
  return errors;
}

function testFailWhenBelowCategoryAccuracy(): string[] {
  const errors: string[] = [];
  const verdict = evaluateGate(metrics({ categoryAccuracy: 0.5 }), DEFAULT_GATE_POLICY, { replayRunId: 'r1', decidedAt: 't' });
  if (verdict.verdict !== 'fail') errors.push(fail('fail-category', `verdict=${verdict.verdict}`));
  const reason = verdict.reasons.find((r) => r.thresholdKey === 'minCategoryAccuracy');
  if (reason?.met !== false) errors.push(fail('fail-category', `reason=${JSON.stringify(reason)}`));
  return errors;
}

function testEveryThresholdReportedIndividually(): string[] {
  const errors: string[] = [];
  const verdict = evaluateGate(metrics({}), DEFAULT_GATE_POLICY, { replayRunId: 'r1', decidedAt: 't' });
  const expectedKeys = ['minCategoryAccuracy', 'minLocationAccuracy', 'maxAmbiguousRate', 'maxFalsePositiveRate', 'maxNewMismatchCaseIds'];
  for (const key of expectedKeys) {
    if (!verdict.reasons.some((r) => r.thresholdKey === key)) errors.push(fail('individual-reasons', `missing reason for ${key}`));
  }
  return errors;
}

function testNullMetricNeverFailsSilently(): string[] {
  const errors: string[] = [];
  // No comparable cases at all -> categoryAccuracy null -> must not fail on missing data.
  const verdict = evaluateGate(metrics({ categoryAccuracy: null }), DEFAULT_GATE_POLICY, { replayRunId: 'r1', decidedAt: 't' });
  const reason = verdict.reasons.find((r) => r.thresholdKey === 'minCategoryAccuracy');
  if (reason?.met !== true || reason?.actual !== null) errors.push(fail('null-metric', `reason=${JSON.stringify(reason)}`));
  return errors;
}

function testNewMismatchNotEvaluatedWithoutBaseline(): string[] {
  const errors: string[] = [];
  const verdict = evaluateGate(metrics({}), DEFAULT_GATE_POLICY, { replayRunId: 'r1', decidedAt: 't' });
  const reason = verdict.reasons.find((r) => r.thresholdKey === 'maxNewMismatchCaseIds');
  if (reason?.actual !== null || reason?.met !== true) {
    errors.push(fail('new-mismatch-no-baseline', 'must be honestly not-evaluated (actual:null, met:true) without a versionComparison'));
  }
  return errors;
}

export function runEvaluateGateSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testPassWhenAboveThresholds,
    testFailWhenBelowCategoryAccuracy,
    testEveryThresholdReportedIndividually,
    testNullMetricNeverFailsSilently,
    testNewMismatchNotEvaluatedWithoutBaseline,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun = typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-evaluate-gate-self-test'));

if (isDirectRun) {
  const { passed, failed } = runEvaluateGateSelfTest();
  if (failed.length) {
    console.error('CCQS evaluate-gate self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`CCQS evaluate-gate self-test OK: ${passed}/5`);
}
