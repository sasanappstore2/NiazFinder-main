/**
 * Self-test for aggregateQualityMetrics — CCQS §3 (`PLAN/ccqs-architecture.md`). Synthetic
 * ComparisonReport-shaped fixtures (isolating aggregation logic from replay/DB correctness).
 *
 * Run via: npm run test:ccqs-metrics
 */
import { aggregateQualityMetrics, type ParsedComparisonRecordForMetrics } from '@/ccqs/metrics/aggregate-quality-metrics';
import type { ComparisonReport, ComparisonStatus, SemanticFieldValue } from '@/semantic-evaluation-engine/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function field(fieldId: string, state: SemanticFieldValue['state'], confidence: number | null = null): SemanticFieldValue {
  return { fieldId, state, value: null, confidence, provenance: { sourceSystem: 'test', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null } };
}

function fr(fieldId: string, status: ComparisonStatus, truthState: SemanticFieldValue['state'], engineState: SemanticFieldValue['state'], engineConfidence: number | null, reasonCode = 'STATE.BOTH_MISSING') {
  return {
    fieldId,
    status,
    snapshotAValue: field(fieldId, truthState),
    snapshotBValue: field(fieldId, engineState, engineConfidence),
    relationship: null,
    reasonCode,
    reasonParams: {},
  };
}

function report(results: ReturnType<typeof fr>[]): ComparisonReport {
  return {
    reportId: 'r', comparedAt: 't', snapshotAId: 'a', snapshotBId: 'b',
    versionStamp: { comparatorEngineVersion: '1.0.0', semanticContractVersion: '1.0.0', ontologyVersions: {} },
    fieldResults: results,
    counts: { comparable: 0, match: 0, refinement: 0, semanticEquivalent: 0, ambiguousButPlausible: 0, contradictionDetected: 0, mismatch: 0, notComparable: 0 },
  };
}

function record(caseId: string, results: ReturnType<typeof fr>[], matchedRuleIds: string[] = ['r1']): ParsedComparisonRecordForMetrics {
  return { caseId, comparisonReport: report(results), ruleTrace: [{ fieldId: 'category', matchedRuleIds }] };
}

function testCategoryAccuracy(): string[] {
  const errors: string[] = [];
  const records = [
    record('c1', [fr('category', 'match', 'resolved', 'resolved', 0.9, 'ONTOLOGY.IDENTICAL')]),
    record('c2', [fr('category', 'refinement', 'resolved', 'resolved', 0.8, 'ONTOLOGY.PARENT_OF')]),
    record('c3', [fr('category', 'mismatch', 'resolved', 'resolved', 0.7)]),
  ];
  const m = aggregateQualityMetrics('run1', records, 'now');
  if (m.categoryAccuracy !== 2 / 3) errors.push(fail('category-accuracy', `got ${m.categoryAccuracy}`));
  return errors;
}

function testNotComparableExcluded(): string[] {
  const errors: string[] = [];
  const records = [record('c1', [fr('location', 'not-comparable', 'resolved', 'missing', null, 'STATE.SOURCE_NEVER_CONTAINED_VALUE')])];
  const m = aggregateQualityMetrics('run1', records, 'now');
  if (m.locationAccuracy !== null) errors.push(fail('not-comparable', `expected null (no comparable cases), got ${m.locationAccuracy}`));
  return errors;
}

function testFalsePositive(): string[] {
  const errors: string[] = [];
  // engine confidently 'resolved' but status is mismatch -> false positive
  const records = [record('c1', [fr('category', 'mismatch', 'resolved', 'resolved', 0.95)])];
  const m = aggregateQualityMetrics('run1', records, 'now');
  if (m.falsePositiveRate !== 1) errors.push(fail('false-positive', `got ${m.falsePositiveRate}`));
  return errors;
}

function testFalseNegative(): string[] {
  const errors: string[] = [];
  // ground truth resolved, engine missing -> false negative
  const records = [record('c1', [fr('category', 'mismatch', 'resolved', 'missing', null, 'STATE.ONE_SIDE_MISSING')])];
  const m = aggregateQualityMetrics('run1', records, 'now');
  if (m.falseNegativeRate !== 1) errors.push(fail('false-negative', `got ${m.falseNegativeRate}`));
  return errors;
}

function testAmbiguousRate(): string[] {
  const errors: string[] = [];
  const records = [
    record('c1', [fr('category', 'match', 'resolved', 'resolved', 0.9)]),
    record('c2', [fr('category', 'ambiguous-but-plausible', 'resolved', 'ambiguous', 0.5, 'STATE.AMBIGUOUS_CANDIDATE_MATCH')]),
  ];
  const m = aggregateQualityMetrics('run1', records, 'now');
  if (m.ambiguousRate !== 0.5) errors.push(fail('ambiguous-rate', `got ${m.ambiguousRate}`));
  return errors;
}

function testConfidenceHistogram(): string[] {
  const errors: string[] = [];
  const records = [
    record('c1', [fr('category', 'match', 'resolved', 'resolved', 0.95)]),
    record('c2', [fr('category', 'match', 'resolved', 'resolved', 0.15)]),
  ];
  const m = aggregateQualityMetrics('run1', records, 'now');
  const hist = m.confidenceHistogramByField.category;
  if (!hist || hist.count !== 2) errors.push(fail('confidence-histogram', `hist=${JSON.stringify(hist)}`));
  if (hist?.buckets[9] !== 1 || hist?.buckets[1] !== 1) errors.push(fail('confidence-histogram', `buckets=${JSON.stringify(hist?.buckets)}`));
  return errors;
}

function testOntologyRefinementStats(): string[] {
  const errors: string[] = [];
  const records = [
    record('c1', [fr('category', 'refinement', 'resolved', 'resolved', 0.9, 'ONTOLOGY.PARENT_OF')]),
    record('c2', [fr('category', 'refinement', 'resolved', 'resolved', 0.9, 'ONTOLOGY.PARENT_OF')]),
    record('c3', [fr('category', 'match', 'resolved', 'resolved', 0.9, 'ONTOLOGY.IDENTICAL')]),
  ];
  const m = aggregateQualityMetrics('run1', records, 'now');
  const parentOf = m.ontologyRefinementStats.find((s) => s.reasonCode === 'ONTOLOGY.PARENT_OF');
  if (parentOf?.count !== 2) errors.push(fail('ontology-stats', `got ${JSON.stringify(m.ontologyRefinementStats)}`));
  return errors;
}

function testRuleCoverageZeroCandidates(): string[] {
  const errors: string[] = [];
  const records = [
    record('c1', [fr('category', 'mismatch', 'resolved', 'missing', null)], []),
    record('c2', [fr('category', 'match', 'resolved', 'resolved', 0.9)], ['r1', 'r2']),
  ];
  const m = aggregateQualityMetrics('run1', records, 'now');
  if (!m.ruleCoverage.zeroCandidateCaseIds.includes('c1')) errors.push(fail('rule-coverage', 'c1 should be flagged as zero-candidate'));
  if (m.ruleCoverage.totalUniqueRulesMatched !== 2) errors.push(fail('rule-coverage', `expected 2 unique rules, got ${m.ruleCoverage.totalUniqueRulesMatched}`));
  return errors;
}

function testIntentAccuracyAlwaysNull(): string[] {
  const errors: string[] = [];
  const m = aggregateQualityMetrics('run1', [record('c1', [fr('category', 'match', 'resolved', 'resolved', 0.9)])], 'now');
  if (m.intentAccuracy !== null) errors.push(fail('intent-accuracy', 'must always be null — no classifier exists yet'));
  return errors;
}

export function runAggregateMetricsSelfTest(): { passed: number; failed: string[] } {
  const suites = [
    testCategoryAccuracy,
    testNotComparableExcluded,
    testFalsePositive,
    testFalseNegative,
    testAmbiguousRate,
    testConfidenceHistogram,
    testOntologyRefinementStats,
    testRuleCoverageZeroCandidates,
    testIntentAccuracyAlwaysNull,
  ];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun = typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-aggregate-metrics-self-test'));

if (isDirectRun) {
  const { passed, failed } = runAggregateMetricsSelfTest();
  if (failed.length) {
    console.error('CCQS aggregate-metrics self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`CCQS aggregate-metrics self-test OK: ${passed}/9`);
}
