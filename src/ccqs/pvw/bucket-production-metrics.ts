/**
 * Production Metric Bucketer — PVW §2.2 module 2, Pillar B. Pure: parsed shadow-event payloads
 * in, one ProductionMetricSnapshot out (I/O — reading IntakeMigrationEvent rows — is the caller's
 * job, per the platform's pure-computation discipline).
 *
 * Deliberately does NOT reuse `aggregateQualityMetrics`: that function's accuracy/FP/FN semantics
 * assume snapshotA is GROUND TRUTH (its own header convention). Shadow events compare
 * legacy-vs-cognitive — neither side is truth — so this bucketer computes only ground-truth-free
 * measures (PVW §2.1): status mix, agreement-with-legacy, ambiguity, confidence distribution,
 * ontology stats, top failure reason codes. Reusing the golden aggregator here would launder
 * agreement into "accuracy" — the exact confusion PVW §2.1 exists to prevent.
 */
import type { ComparisonReport } from '@/semantic-evaluation-engine/types';
import { WINDOW_SPEC_VERSION, type ProductionMetricSnapshot } from './types';
import type { ConfidenceHistogram } from '../types';

/** Same status set CCQS counts as "good" — here it means agreement, not correctness. */
const AGREEMENT_STATUSES = new Set(['match', 'refinement', 'semantic-equivalent']);
const FAILURE_STATUSES = new Set(['mismatch', 'contradiction-detected']);

export interface ParsedShadowEventForMetrics {
  comparisonReport: ComparisonReport;
  /** Present only on version-stamped events (G4 closure) — null for older history. */
  engineLabel: string | null;
}

function emptyHistogram(): ConfidenceHistogram {
  return { buckets: new Array(10).fill(0), count: 0 };
}

export function bucketProductionMetrics(
  events: ParsedShadowEventForMetrics[],
  bucketStart: Date,
  bucketEnd: Date
): ProductionMetricSnapshot {
  const statusCountsByField: Record<string, Record<string, number>> = {};
  const confidenceHistogramByField: Record<string, ConfidenceHistogram> = {};
  const ontologyStatsMap = new Map<string, number>();
  const failureReasonMap = new Map<string, number>();
  const agreementNum: Record<string, number> = {};
  const agreementDen: Record<string, number> = {};
  const engineLabels = new Set<string>();

  let comparableTotal = 0;
  let ambiguousCount = 0;
  let mismatchCount = 0;
  let refinementCount = 0;

  for (const ev of events) {
    if (ev.engineLabel) engineLabels.add(ev.engineLabel);
    for (const fr of ev.comparisonReport.fieldResults) {
      statusCountsByField[fr.fieldId] ??= {};
      statusCountsByField[fr.fieldId]![fr.status] = (statusCountsByField[fr.fieldId]![fr.status] ?? 0) + 1;

      const engineConfidence = fr.snapshotBValue.confidence;
      if (engineConfidence !== null) {
        const hist = (confidenceHistogramByField[fr.fieldId] ??= emptyHistogram());
        hist.buckets[Math.min(9, Math.max(0, Math.floor(engineConfidence * 10)))]!++;
        hist.count++;
      }

      if (fr.status !== 'not-comparable') {
        comparableTotal++;
        agreementDen[fr.fieldId] = (agreementDen[fr.fieldId] ?? 0) + 1;
        if (AGREEMENT_STATUSES.has(fr.status)) agreementNum[fr.fieldId] = (agreementNum[fr.fieldId] ?? 0) + 1;
        if (fr.status === 'ambiguous-but-plausible') ambiguousCount++;
        if (fr.status === 'refinement') refinementCount++;
        if (FAILURE_STATUSES.has(fr.status)) {
          mismatchCount++;
          failureReasonMap.set(fr.reasonCode, (failureReasonMap.get(fr.reasonCode) ?? 0) + 1);
        }
      }
      if (fr.reasonCode.startsWith('ONTOLOGY.')) {
        ontologyStatsMap.set(fr.reasonCode, (ontologyStatsMap.get(fr.reasonCode) ?? 0) + 1);
      }
    }
  }

  const agreementRateByField: Record<string, number | null> = {};
  for (const fieldId of Object.keys(agreementDen)) {
    agreementRateByField[fieldId] = agreementDen[fieldId]! > 0 ? (agreementNum[fieldId] ?? 0) / agreementDen[fieldId]! : null;
  }

  return {
    windowSpecVersion: WINDOW_SPEC_VERSION,
    bucketStart: bucketStart.toISOString(),
    bucketEnd: bucketEnd.toISOString(),
    totalEvents: events.length,
    agreementRateByField,
    ambiguousRate: comparableTotal > 0 ? ambiguousCount / comparableTotal : null,
    mismatchRate: comparableTotal > 0 ? mismatchCount / comparableTotal : null,
    refinementRate: comparableTotal > 0 ? refinementCount / comparableTotal : null,
    statusCountsByField,
    confidenceHistogramByField,
    ontologyRefinementStats: [...ontologyStatsMap.entries()].map(([reasonCode, count]) => ({ reasonCode, count })),
    topFailureReasons: [...failureReasonMap.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, 10)
      .map(([reasonCode, count]) => ({ reasonCode, count })),
    engineLabelsSeen: [...engineLabels].sort(),
  };
}
