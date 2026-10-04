/**
 * PVW pure-module self-test — bucketer, trend detector, alert evaluator (PVW §2.2 modules 2/4/5).
 * Synthetic inputs, no DB, no LLM — same isolation discipline as every other CCQS/SEE self-test.
 * Run via: npm run test:ccqs-pvw
 */
import { bucketProductionMetrics, type ParsedShadowEventForMetrics } from '../pvw/bucket-production-metrics';
import { detectTrends } from '../pvw/detect-trends';
import { DEFAULT_ALERT_POLICY, evaluateGoldenAlerts, evaluateProductionAlerts, tvDistance } from '../pvw/evaluate-alerts';
import { productionMetricSnapshotSchema, utcDayBucket, type ProductionMetricSnapshot } from '../pvw/types';
import type { ComparisonReport } from '@/semantic-evaluation-engine/types';
import type { QualityMetricSnapshot, VersionComparisonReport } from '../types';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean): void {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}`);
  }
}

function fieldResult(fieldId: string, status: string, reasonCode: string, confidence: number | null): ComparisonReport['fieldResults'][number] {
  return {
    fieldId,
    status,
    reasonCode,
    reasonParams: {},
    snapshotAValue: { fieldId, state: 'resolved', value: null, confidence: 0.9, provenance: { sourceSystem: 'legacy', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null } },
    snapshotBValue: { fieldId, state: 'resolved', value: null, confidence, provenance: { sourceSystem: 'cognitive-engine-v1', evidenceRefs: [], derivation: 'direct', rawInputContainsValue: null } },
  } as unknown as ComparisonReport['fieldResults'][number];
}

function shadowEvent(categoryStatus: string, reasonCode: string, confidence: number, engineLabel: string | null = null): ParsedShadowEventForMetrics {
  return {
    engineLabel,
    comparisonReport: {
      reportId: 'r',
      comparedAt: 't',
      comparatorEngineVersion: '1.0.0',
      semanticContractVersion: '1.0.0',
      ontologyVersions: {},
      snapshotAId: 'a',
      snapshotBId: 'b',
      fieldResults: [fieldResult('category', categoryStatus, reasonCode, confidence), fieldResult('location', 'match', 'STATE.BOTH_RESOLVED_MATCH', 0.5)],
      counts: { match: 0, mismatch: 0, refinement: 0, semanticEquivalent: 0, ambiguousButPlausible: 0, notComparable: 0, contradictionDetected: 0 },
    } as unknown as ComparisonReport,
  };
}

// ── 1. Bucketer ─────────────────────────────────────────────────────────────
const { bucketStart, bucketEnd } = utcDayBucket('2026-07-08');
const events = [
  shadowEvent('match', 'ONTOLOGY.IDENTICAL', 0.95, 'v1+rules-1.1.0'),
  shadowEvent('mismatch', 'STATE.AMBIGUOUS_CANDIDATE_MISMATCH', 0.85, 'v1+rules-1.1.0'),
  shadowEvent('ambiguous-but-plausible', 'STATE.AMBIGUOUS_CANDIDATE_MATCH', 0.7, null),
  shadowEvent('refinement', 'ONTOLOGY.PARENT_OF', 0.9, 'v1+rules-1.1.0'),
];
const snap = bucketProductionMetrics(events, bucketStart, bucketEnd);
check('bucketer: schema-valid output', productionMetricSnapshotSchema.safeParse(snap).success);
check('bucketer: totalEvents', snap.totalEvents === 4);
check('bucketer: category agreement 2/4 (match+refinement)', snap.agreementRateByField['category'] === 0.5);
check('bucketer: location agreement 4/4', snap.agreementRateByField['location'] === 1);
check('bucketer: ambiguousRate 1/8 comparable', snap.ambiguousRate === 1 / 8);
check('bucketer: mismatchRate 1/8', snap.mismatchRate === 1 / 8);
check('bucketer: top failure reason recorded', snap.topFailureReasons[0]?.reasonCode === 'STATE.AMBIGUOUS_CANDIDATE_MISMATCH');
check('bucketer: engine labels deduped, unstamped excluded', snap.engineLabelsSeen.length === 1 && snap.engineLabelsSeen[0] === 'v1+rules-1.1.0');
check('bucketer: confidence histogram counted', snap.confidenceHistogramByField['category']?.count === 4);
check('bucketer: no accuracy key exists (ground-truth-free naming)', !('categoryAccuracy' in snap));

// ── 2. Trend detector determinism + windows ─────────────────────────────────
const mkTrendSnap = (day: string, amb: number) => ({ snapshotId: `s-${day}`, at: `${day}T00:00:00.000Z`, values: { ambiguousRate: amb } });
const series = [mkTrendSnap('2026-07-01', 0.02), mkTrendSnap('2026-07-05', 0.03), mkTrendSnap('2026-07-08', 0.05)];
const t1 = detectTrends('production', series, ['ambiguousRate'], '2026-07-09T00:00:00.000Z');
const t2 = detectTrends('production', [...series].reverse(), ['ambiguousRate'], '2026-07-09T00:00:00.000Z');
check('trends: deterministic under input reordering', JSON.stringify(t1) === JSON.stringify(t2));
const week = t1.windows.find((w) => w.windowLabel === 'last-week')!;
check('trends: last-week window covers 2 samples', week.sampleCount === 2 && week.delta !== null && Math.abs(week.delta - 0.02) < 1e-12);
const month = t1.windows.find((w) => w.windowLabel === 'last-month')!;
check('trends: last-month covers all 3', month.sampleCount === 3 && month.startValue === 0.02 && month.endValue === 0.05);
check('trends: future snapshots excluded by asOf', detectTrends('production', series, ['ambiguousRate'], '2026-07-06T00:00:00.000Z').windows.find((w) => w.windowLabel === 'last-month')!.sampleCount === 2);

// ── 3. Alert evaluator — golden ─────────────────────────────────────────────
const golden = (acc: number): QualityMetricSnapshot => ({
  replayRunId: 'r', computedAt: 't', totalCases: 33, categoryAccuracy: acc, locationAccuracy: 0.9, intentAccuracy: null,
  ambiguousRate: 0.05, falsePositiveRate: 0, falseNegativeRate: 0, confidenceHistogramByField: {}, ontologyRefinementStats: [],
  ruleCoverage: { totalUniqueRulesMatched: 10, zeroCandidateCaseIds: [] }, statusCountsByField: {},
});
const cmp = (regressed: number): VersionComparisonReport => ({ runAId: 'a', runBId: 'b', metricDeltas: {}, caseDiffs: [], improvedCount: 0, regressedCount: regressed, unchangedCount: 0 });
check('golden alerts: clean pair fires nothing', evaluateGoldenAlerts(DEFAULT_ALERT_POLICY, { snapshotId: 'c', metrics: golden(0.94) }, { snapshotId: 'p', metrics: golden(0.93) }, cmp(0)).length === 0);
const dropAlerts = evaluateGoldenAlerts(DEFAULT_ALERT_POLICY, { snapshotId: 'c', metrics: golden(0.85) }, { snapshotId: 'p', metrics: golden(0.94) }, cmp(0));
check('golden alerts: accuracy drop fires critical', dropAlerts.length === 1 && dropAlerts[0]!.alertKey === 'category-accuracy-drop' && dropAlerts[0]!.severity === 'critical');
const regAlerts = evaluateGoldenAlerts(DEFAULT_ALERT_POLICY, { snapshotId: 'c', metrics: golden(0.94) }, { snapshotId: 'p', metrics: golden(0.94) }, cmp(2));
check('golden alerts: any regression fires', regAlerts.length === 1 && regAlerts[0]!.alertKey === 'rule-regression');
check('golden alerts: policy version stamped', regAlerts[0]!.alertPolicyVersion === '1.0.0');

// ── 4. Alert evaluator — production ─────────────────────────────────────────
const prodSnap = (day: string, amb: number, mis: number): { snapshotId: string; metrics: ProductionMetricSnapshot } => ({
  snapshotId: `p-${day}`,
  metrics: { ...snap, bucketStart: `${day}T00:00:00.000Z`, bucketEnd: `${day}T24:00:00.000Z`, ambiguousRate: amb, mismatchRate: mis },
});
const calmWeek = ['01', '02', '03', '04', '05', '06', '07'].map((d) => prodSnap(`2026-07-${d}`, 0.02, 0.01));
check('production alerts: calm day fires nothing', evaluateProductionAlerts(DEFAULT_ALERT_POLICY, prodSnap('2026-07-08', 0.02, 0.01), calmWeek).length === 0);
const spike = evaluateProductionAlerts(DEFAULT_ALERT_POLICY, prodSnap('2026-07-08', 0.09, 0.05), calmWeek);
check('production alerts: ambiguity spike fires warning', spike.some((a) => a.alertKey === 'ambiguity-spike' && a.severity === 'warning'));
check('production alerts: mismatch spike fires critical', spike.some((a) => a.alertKey === 'mismatch-spike' && a.severity === 'critical'));
check('production alerts: below-floor spike suppressed (1.9x but tiny)', evaluateProductionAlerts(DEFAULT_ALERT_POLICY, prodSnap('2026-07-08', 0.019, 0.001), calmWeek.map((s) => ({ ...s, metrics: { ...s.metrics, ambiguousRate: 0.01, mismatchRate: 0.0005 } }))).length === 0);

// ── 5. TV distance ──────────────────────────────────────────────────────────
const h = (b: number[]): { buckets: number[]; count: number } => ({ buckets: b, count: b.reduce((a, x) => a + x, 0) });
check('tv: identical distributions = 0', tvDistance(h([0, 0, 0, 0, 0, 5, 5, 0, 0, 0]), h([0, 0, 0, 0, 0, 10, 10, 0, 0, 0])) === 0);
check('tv: disjoint distributions = 1', tvDistance(h([10, 0, 0, 0, 0, 0, 0, 0, 0, 0]), h([0, 0, 0, 0, 0, 0, 0, 0, 0, 10])) === 1);
check('tv: empty histogram → null, never fabricated', tvDistance(h([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), h([1, 0, 0, 0, 0, 0, 0, 0, 0, 0])) === null);

console.log(`\nPVW self-test: ${passed}/${passed + failed} OK${failed ? ` — ${failed} FAILED` : ''}`);
if (failed) process.exit(1);
