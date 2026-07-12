/**
 * aggregateQualityMetrics — CCQS §1.5/§3 (`PLAN/ccqs-architecture.md`). Pure function: takes
 * already-parsed `ComparisonRecord`-shaped data (I/O — reading from Postgres, JSON-parsing — is
 * the caller's job, kept out of this file on purpose, matching SEE's own "pure computation, no I/O"
 * discipline for Comparator/Scoring Policy code) and produces a `QualityMetricSnapshot`.
 *
 * Convention fixed here: every `ComparisonRecord` in this system was produced by
 * `compareSnapshots(truthSnapshot, engineSnapshot, ...)` — i.e. `snapshotAValue` is always ground
 * truth, `snapshotBValue` is always the engine under test. False-positive/negative and confidence-
 * distribution metrics below depend on this ordering.
 */
import type { ComparisonReport } from '@/semantic-evaluation-engine/types';
import type {
  ConfidenceHistogram,
  QualityMetricSnapshot,
  RuleTraceEntry,
} from '../types';

export interface ParsedComparisonRecordForMetrics {
  caseId: string;
  comparisonReport: ComparisonReport;
  ruleTrace: RuleTraceEntry[];
}

const GOOD_STATUSES = new Set(['match', 'refinement', 'semantic-equivalent']);

function emptyHistogram(): ConfidenceHistogram {
  return { buckets: new Array(10).fill(0), count: 0 };
}

export function aggregateQualityMetrics(
  replayRunId: string,
  records: ParsedComparisonRecordForMetrics[],
  computedAt: string
): QualityMetricSnapshot {
  const statusCountsByField: Record<string, Record<string, number>> = {};
  const confidenceHistogramByField: Record<string, ConfidenceHistogram> = {};
  const ontologyStatsMap = new Map<string, number>();
  const allMatchedRuleIds = new Set<string>();
  const zeroCandidateCaseIds: string[] = [];

  let categoryComparable = 0;
  let categoryGood = 0;
  let locationComparable = 0;
  let locationGood = 0;
  let comparableTotal = 0;
  let ambiguousCount = 0;
  let falsePositiveCount = 0;
  let falseNegativeCount = 0;
  let groundTruthResolvedCount = 0;

  for (const record of records) {
    for (const fr of record.comparisonReport.fieldResults) {
      statusCountsByField[fr.fieldId] ??= {};
      statusCountsByField[fr.fieldId][fr.status] = (statusCountsByField[fr.fieldId][fr.status] ?? 0) + 1;

      const engineConfidence = fr.snapshotBValue.confidence;
      if (engineConfidence !== null) {
        const hist = (confidenceHistogramByField[fr.fieldId] ??= emptyHistogram());
        const bucket = Math.min(9, Math.max(0, Math.floor(engineConfidence * 10)));
        hist.buckets[bucket]!++;
        hist.count++;
      }

      if (fr.status !== 'not-comparable') {
        comparableTotal++;
        if (fr.status === 'ambiguous-but-plausible') ambiguousCount++;
      }

      if (fr.fieldId === 'category' && fr.status !== 'not-comparable') {
        categoryComparable++;
        if (GOOD_STATUSES.has(fr.status)) categoryGood++;
      }
      if (fr.fieldId === 'location' && fr.status !== 'not-comparable') {
        locationComparable++;
        if (GOOD_STATUSES.has(fr.status)) locationGood++;
      }

      if (fr.reasonCode.startsWith('ONTOLOGY.')) {
        ontologyStatsMap.set(fr.reasonCode, (ontologyStatsMap.get(fr.reasonCode) ?? 0) + 1);
      }

      // Ground truth = snapshotA, engine under test = snapshotB (see file header convention).
      const truthState = fr.snapshotAValue.state;
      const engineState = fr.snapshotBValue.state;
      if (truthState === 'resolved') {
        groundTruthResolvedCount++;
        if (engineState === 'missing' || engineState === 'unknown') falseNegativeCount++;
      }
      if (engineState === 'resolved' && (fr.status === 'mismatch' || fr.status === 'contradiction-detected')) {
        falsePositiveCount++;
      }
    }

    for (const rt of record.ruleTrace) {
      if (rt.fieldId !== 'category') continue;
      if (rt.matchedRuleIds.length === 0) zeroCandidateCaseIds.push(record.caseId);
      rt.matchedRuleIds.forEach((id) => allMatchedRuleIds.add(id));
    }
  }

  return {
    replayRunId,
    computedAt,
    totalCases: records.length,
    categoryAccuracy: categoryComparable > 0 ? categoryGood / categoryComparable : null,
    locationAccuracy: locationComparable > 0 ? locationGood / locationComparable : null,
    // Always null — no intent classifier exists in the Cognitive Engine yet (§3 #8 of the CCQS
    // doc). Wired, not fabricated.
    intentAccuracy: null,
    ambiguousRate: comparableTotal > 0 ? ambiguousCount / comparableTotal : null,
    falsePositiveRate: comparableTotal > 0 ? falsePositiveCount / comparableTotal : null,
    falseNegativeRate: groundTruthResolvedCount > 0 ? falseNegativeCount / groundTruthResolvedCount : null,
    confidenceHistogramByField,
    ontologyRefinementStats: [...ontologyStatsMap.entries()].map(([reasonCode, count]) => ({ reasonCode, count })),
    ruleCoverage: { totalUniqueRulesMatched: allMatchedRuleIds.size, zeroCandidateCaseIds },
    statusCountsByField,
  };
}
