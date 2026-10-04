/**
 * Alert Evaluator — PVW §5. Pure and deterministic: snapshots + policy in, AlertDrafts out.
 * Persistence (CcqsAlertEvent rows) is the caller's job. Thresholds live in the versioned
 * AlertPolicy — "a starting point, undertuned like every other default-v1 value in this system"
 * (PVW §5, verbatim). Changing any threshold is a NEW alertPolicyVersion (PVW §2.3), never an
 * edit (SEE §14.4 / CGP MEI-11 discipline applied to alert policies).
 */
import type { QualityMetricSnapshot, VersionComparisonReport } from '../types';
import type { AlertDraft, AlertPolicy, ProductionMetricSnapshot } from './types';
import type { ConfidenceHistogram } from '../types';

export const DEFAULT_ALERT_POLICY: AlertPolicy = {
  alertPolicyId: 'pvw-default',
  alertPolicyVersion: '1.0.0',
  thresholds: {
    maxCategoryAccuracyDrop: 0.03,
    maxRegressedCases: 0,
    ambiguitySpikeMultiplier: 1.5,
    ambiguitySpikeFloor: 0.02,
    mismatchSpikeMultiplier: 2.0,
    mismatchSpikeFloor: 0.02,
    maxConfidenceTvDistance: 0.15,
    maxLocationAgreementDrop: 0.05,
  },
};

function draft(
  policy: AlertPolicy,
  alertKey: string,
  severity: AlertDraft['severity'],
  detail: Record<string, unknown>,
  sourceSnapshotIds: string[]
): AlertDraft {
  return { alertPolicyId: policy.alertPolicyId, alertPolicyVersion: policy.alertPolicyVersion, alertKey, severity, detail, sourceSnapshotIds };
}

/** Total-variation distance between two decile histograms (normalized to distributions). */
export function tvDistance(a: ConfidenceHistogram, b: ConfidenceHistogram): number | null {
  if (a.count === 0 || b.count === 0) return null;
  let tv = 0;
  for (let i = 0; i < 10; i++) tv += Math.abs(a.buckets[i]! / a.count - b.buckets[i]! / b.count);
  return tv / 2;
}

/** Pillar A — release comparison alerts (PVW §5 rows 1 and 6). */
export function evaluateGoldenAlerts(
  policy: AlertPolicy,
  current: { snapshotId: string; metrics: QualityMetricSnapshot },
  previous: { snapshotId: string; metrics: QualityMetricSnapshot },
  comparison: VersionComparisonReport
): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  const sources = [previous.snapshotId, current.snapshotId];

  const prevAcc = previous.metrics.categoryAccuracy;
  const curAcc = current.metrics.categoryAccuracy;
  if (prevAcc !== null && curAcc !== null && prevAcc - curAcc > policy.thresholds.maxCategoryAccuracyDrop) {
    alerts.push(
      draft(policy, 'category-accuracy-drop', 'critical', { before: prevAcc, after: curAcc, drop: prevAcc - curAcc, threshold: policy.thresholds.maxCategoryAccuracyDrop, runA: comparison.runAId, runB: comparison.runBId }, sources)
    );
  }
  if (comparison.regressedCount > policy.thresholds.maxRegressedCases) {
    alerts.push(
      draft(policy, 'rule-regression', 'critical', {
        regressedCount: comparison.regressedCount,
        regressedCases: comparison.caseDiffs.filter((d) => d.classification === 'regressed').map((d) => ({ caseId: d.caseId, fieldId: d.fieldId, before: d.before?.reasonCode, after: d.after?.reasonCode })),
        runA: comparison.runAId,
        runB: comparison.runBId,
      }, sources)
    );
  }
  return alerts;
}

/** Pillar B — daily production alerts vs. the rolling window (PVW §5 rows 2-5).
 *  `prior` must be the daily snapshots BEFORE `today`, ascending; caller supplies snapshot ids. */
export function evaluateProductionAlerts(
  policy: AlertPolicy,
  today: { snapshotId: string; metrics: ProductionMetricSnapshot },
  prior: Array<{ snapshotId: string; metrics: ProductionMetricSnapshot }>
): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  const last7 = prior.slice(-7);
  const avg = (xs: Array<number | null>): number | null => {
    const real = xs.filter((x): x is number => x !== null);
    return real.length ? real.reduce((a, b) => a + b, 0) / real.length : null;
  };

  const ambAvg = avg(last7.map((s) => s.metrics.ambiguousRate));
  const amb = today.metrics.ambiguousRate;
  if (amb !== null && ambAvg !== null && amb >= policy.thresholds.ambiguitySpikeFloor && amb > ambAvg * policy.thresholds.ambiguitySpikeMultiplier) {
    alerts.push(draft(policy, 'ambiguity-spike', 'warning', { today: amb, rollingAvg: ambAvg, multiplier: policy.thresholds.ambiguitySpikeMultiplier }, [today.snapshotId, ...last7.map((s) => s.snapshotId)]));
  }

  const misAvg = avg(last7.map((s) => s.metrics.mismatchRate));
  const mis = today.metrics.mismatchRate;
  if (mis !== null && misAvg !== null && mis >= policy.thresholds.mismatchSpikeFloor && mis > misAvg * policy.thresholds.mismatchSpikeMultiplier) {
    alerts.push(draft(policy, 'mismatch-spike', 'critical', { today: mis, rollingAvg: misAvg, multiplier: policy.thresholds.mismatchSpikeMultiplier }, [today.snapshotId, ...last7.map((s) => s.snapshotId)]));
  }

  // Weekly comparisons need ≥ 8 prior days (this week's 7 + at least 1 of the prior week) —
  // below that, silence is correct (no fabricated baselines; the "wired, not fabricated" rule).
  const thisWeek = [...prior.slice(-6), today];
  const prevWeek = prior.slice(-13, -6);
  if (prevWeek.length >= 3) {
    const mergeHist = (snaps: Array<{ metrics: ProductionMetricSnapshot }>, field: string): ConfidenceHistogram => {
      const merged: ConfidenceHistogram = { buckets: new Array(10).fill(0), count: 0 };
      for (const s of snaps) {
        const h = s.metrics.confidenceHistogramByField[field];
        if (!h) continue;
        for (let i = 0; i < 10; i++) merged.buckets[i]! += h.buckets[i]!;
        merged.count += h.count;
      }
      return merged;
    };
    const tv = tvDistance(mergeHist(thisWeek, 'category'), mergeHist(prevWeek, 'category'));
    if (tv !== null && tv > policy.thresholds.maxConfidenceTvDistance) {
      alerts.push(draft(policy, 'confidence-shift', 'warning', { tvDistance: tv, threshold: policy.thresholds.maxConfidenceTvDistance, field: 'category' }, [today.snapshotId, ...prior.slice(-13).map((s) => s.snapshotId)]));
    }

    const weekAvg = (snaps: Array<{ metrics: ProductionMetricSnapshot }>): number | null => {
      const vals = snaps.map((s) => s.metrics.agreementRateByField['location'] ?? null).filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const thisW = weekAvg(thisWeek);
    const prevW = weekAvg(prevWeek);
    if (thisW !== null && prevW !== null && prevW - thisW > policy.thresholds.maxLocationAgreementDrop) {
      alerts.push(draft(policy, 'location-agreement-drop', 'warning', { thisWeek: thisW, prevWeek: prevW, drop: prevW - thisW }, [today.snapshotId, ...prior.slice(-13).map((s) => s.snapshotId)]));
    }
  }

  return alerts;
}
