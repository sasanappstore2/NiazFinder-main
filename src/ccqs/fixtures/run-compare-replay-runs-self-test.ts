/**
 * Self-test for compareReplayRuns — CCQS §5 (`PLAN/ccqs-architecture.md`). Reproduces, in
 * miniature, the exact pattern this session's Priority 3 fix produced live
 * (STATE.ONE_SIDE_MISSING → ONTOLOGY.IDENTICAL for the موتور سیکلت case) to prove the version
 * comparator would have caught it automatically.
 *
 * Run via: npm run test:ccqs-compare
 */
import { compareReplayRuns } from '@/ccqs/compare/compare-replay-runs';
import { aggregateQualityMetrics, type ParsedComparisonRecordForMetrics } from '@/ccqs/metrics/aggregate-quality-metrics';
import type { ComparisonReport, ComparisonStatus, SemanticFieldValue } from '@/semantic-evaluation-engine/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function field(state: SemanticFieldValue['state']): SemanticFieldValue {
  return { fieldId: 'category', state, value: null, confidence: state === 'resolved' ? 0.9 : null, provenance: { sourceSystem: 'test', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null } };
}

function report(status: ComparisonStatus, reasonCode: string, engineState: SemanticFieldValue['state']): ComparisonReport {
  return {
    reportId: 'r', comparedAt: 't', snapshotAId: 'a', snapshotBId: 'b',
    versionStamp: { comparatorEngineVersion: '1.0.0', semanticContractVersion: '1.0.0', ontologyVersions: {} },
    fieldResults: [{ fieldId: 'category', status, snapshotAValue: field('resolved'), snapshotBValue: field(engineState), relationship: null, reasonCode, reasonParams: {} }],
    counts: { comparable: 1, match: status === 'match' ? 1 : 0, refinement: 0, semanticEquivalent: 0, ambiguousButPlausible: 0, contradictionDetected: 0, mismatch: status === 'mismatch' ? 1 : 0, notComparable: 0 },
  };
}

function rec(caseId: string, r: ComparisonReport): ParsedComparisonRecordForMetrics {
  return { caseId, comparisonReport: r, ruleTrace: [{ fieldId: 'category', matchedRuleIds: [] }] };
}

function testMotorcycleFixIsClassifiedImproved(): string[] {
  const errors: string[] = [];
  const before = [rec('moto-1', report('mismatch', 'STATE.ONE_SIDE_MISSING', 'missing'))];
  const after = [rec('moto-1', report('match', 'ONTOLOGY.IDENTICAL', 'resolved'))];
  const metricsBefore = aggregateQualityMetrics('runA', before, 't');
  const metricsAfter = aggregateQualityMetrics('runB', after, 't');
  const result = compareReplayRuns('runA', before, metricsBefore, 'runB', after, metricsAfter);

  const diff = result.caseDiffs.find((d) => d.caseId === 'moto-1' && d.fieldId === 'category');
  if (diff?.classification !== 'improved') errors.push(fail('moto-fix', `classification=${diff?.classification}`));
  if (diff?.before?.reasonCode !== 'STATE.ONE_SIDE_MISSING' || diff?.after?.reasonCode !== 'ONTOLOGY.IDENTICAL') {
    errors.push(fail('moto-fix', `reasonCodes wrong: ${JSON.stringify(diff)}`));
  }
  if (result.improvedCount !== 1 || result.regressedCount !== 0) errors.push(fail('moto-fix', `improved=${result.improvedCount} regressed=${result.regressedCount}`));
  if (result.metricDeltas.categoryAccuracy?.delta !== 1) errors.push(fail('moto-fix', `categoryAccuracy delta=${result.metricDeltas.categoryAccuracy?.delta}`));
  return errors;
}

function testRegression(): string[] {
  const errors: string[] = [];
  const before = [rec('c1', report('match', 'ONTOLOGY.IDENTICAL', 'resolved'))];
  const after = [rec('c1', report('mismatch', 'STATE.ONE_SIDE_MISSING', 'missing'))];
  const metricsBefore = aggregateQualityMetrics('runA', before, 't');
  const metricsAfter = aggregateQualityMetrics('runB', after, 't');
  const result = compareReplayRuns('runA', before, metricsBefore, 'runB', after, metricsAfter);
  if (result.regressedCount !== 1) errors.push(fail('regression', `regressedCount=${result.regressedCount}`));
  return errors;
}

function testUnchanged(): string[] {
  const errors: string[] = [];
  const before = [rec('c1', report('match', 'ONTOLOGY.IDENTICAL', 'resolved'))];
  const after = [rec('c1', report('match', 'ONTOLOGY.IDENTICAL', 'resolved'))];
  const metricsBefore = aggregateQualityMetrics('runA', before, 't');
  const metricsAfter = aggregateQualityMetrics('runB', after, 't');
  const result = compareReplayRuns('runA', before, metricsBefore, 'runB', after, metricsAfter);
  if (result.unchangedCount !== 1 || result.improvedCount !== 0 || result.regressedCount !== 0) {
    errors.push(fail('unchanged', JSON.stringify(result)));
  }
  return errors;
}

function testNewlyComparable(): string[] {
  const errors: string[] = [];
  const before = [rec('c1', report('not-comparable', 'STATE.SOURCE_NEVER_CONTAINED_VALUE', 'missing'))];
  const after = [rec('c1', report('match', 'ONTOLOGY.IDENTICAL', 'resolved'))];
  const metricsBefore = aggregateQualityMetrics('runA', before, 't');
  const metricsAfter = aggregateQualityMetrics('runB', after, 't');
  const result = compareReplayRuns('runA', before, metricsBefore, 'runB', after, metricsAfter);
  const diff = result.caseDiffs.find((d) => d.caseId === 'c1');
  if (diff?.classification !== 'newly-comparable') errors.push(fail('newly-comparable', `classification=${diff?.classification}`));
  return errors;
}

export function runCompareReplayRunsSelfTest(): { passed: number; failed: string[] } {
  const suites = [testMotorcycleFixIsClassifiedImproved, testRegression, testUnchanged, testNewlyComparable];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun = typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-compare-replay-runs-self-test'));

if (isDirectRun) {
  const { passed, failed } = runCompareReplayRunsSelfTest();
  if (failed.length) {
    console.error('CCQS compare-replay-runs self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`CCQS compare-replay-runs self-test OK: ${passed}/4`);
}
