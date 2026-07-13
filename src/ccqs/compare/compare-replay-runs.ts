/**
 * compareReplayRuns — CCQS §5 (`PLAN/ccqs-architecture.md`). Pure function (no I/O — callers fetch
 * both runs' records/metrics first, matching every other CCQS pure-function boundary). Answers the
 * Regression Protection questions mechanically: improved/regressed counts, per-field/per-ontology
 * diffs, "exactly why" via each side's already-explainable `reasonCode`.
 */
import type { ComparisonStatus } from '@/semantic-evaluation-engine/types';
import type { ParsedComparisonRecordForMetrics } from '../metrics/aggregate-quality-metrics';
import type { CaseDiff, CaseDiffClassification, MetricDelta, QualityMetricSnapshot, VersionComparisonReport } from '../types';

/** Higher rank = more acceptable. `not-comparable` is handled separately (see below), never ranked
 *  alongside real outcomes — comparing "we couldn't compare" against "we compared and it matched"
 *  is a category-presence change, not a quality change. */
function statusRank(status: ComparisonStatus): number {
  switch (status) {
    case 'match':
      return 3;
    case 'refinement':
    case 'semantic-equivalent':
      return 2;
    case 'ambiguous-but-plausible':
      return 1;
    case 'mismatch':
    case 'contradiction-detected':
      return 0;
    default:
      return 0;
  }
}

function classify(
  before: { status: ComparisonStatus; reasonCode: string } | null,
  after: { status: ComparisonStatus; reasonCode: string } | null
): CaseDiffClassification {
  if (!before && !after) return 'unchanged';
  if (!before) return after!.status === 'not-comparable' ? 'newly-not-comparable' : 'newly-comparable';
  if (!after) return before.status === 'not-comparable' ? 'newly-not-comparable' : 'newly-comparable';

  const beforeComparable = before.status !== 'not-comparable';
  const afterComparable = after.status !== 'not-comparable';
  if (!beforeComparable && afterComparable) return 'newly-comparable';
  if (beforeComparable && !afterComparable) return 'newly-not-comparable';
  if (!beforeComparable && !afterComparable) return 'unchanged';

  const rankBefore = statusRank(before.status);
  const rankAfter = statusRank(after.status);
  if (rankAfter > rankBefore) return 'improved';
  if (rankAfter < rankBefore) return 'regressed';
  return 'unchanged';
}

const METRIC_KEYS = [
  'categoryAccuracy',
  'locationAccuracy',
  'ambiguousRate',
  'falsePositiveRate',
  'falseNegativeRate',
] as const;

export function compareReplayRuns(
  runAId: string,
  recordsA: ParsedComparisonRecordForMetrics[],
  metricsA: QualityMetricSnapshot,
  runBId: string,
  recordsB: ParsedComparisonRecordForMetrics[],
  metricsB: QualityMetricSnapshot
): VersionComparisonReport {
  const byCaseA = new Map(recordsA.map((r) => [r.caseId, r]));
  const byCaseB = new Map(recordsB.map((r) => [r.caseId, r]));
  const allCaseIds = new Set([...byCaseA.keys(), ...byCaseB.keys()]);

  const caseDiffs: CaseDiff[] = [];

  for (const caseId of allCaseIds) {
    const fieldsA = new Map((byCaseA.get(caseId)?.comparisonReport.fieldResults ?? []).map((fr) => [fr.fieldId, fr]));
    const fieldsB = new Map((byCaseB.get(caseId)?.comparisonReport.fieldResults ?? []).map((fr) => [fr.fieldId, fr]));
    const allFieldIds = new Set([...fieldsA.keys(), ...fieldsB.keys()]);

    for (const fieldId of allFieldIds) {
      const frA = fieldsA.get(fieldId);
      const frB = fieldsB.get(fieldId);
      const before = frA ? { status: frA.status, reasonCode: frA.reasonCode } : null;
      const after = frB ? { status: frB.status, reasonCode: frB.reasonCode } : null;
      caseDiffs.push({ caseId, fieldId, before, after, classification: classify(before, after) });
    }
  }

  const metricDeltas: Record<string, MetricDelta> = {};
  for (const key of METRIC_KEYS) {
    const before = metricsA[key];
    const after = metricsB[key];
    metricDeltas[key] = { before, after, delta: before != null && after != null ? after - before : null };
  }

  return {
    runAId,
    runBId,
    metricDeltas,
    caseDiffs,
    improvedCount: caseDiffs.filter((d) => d.classification === 'improved').length,
    regressedCount: caseDiffs.filter((d) => d.classification === 'regressed').length,
    unchangedCount: caseDiffs.filter((d) => d.classification === 'unchanged').length,
  };
}
