/**
 * evaluateGate — CCQS §1.6/§6 (`PLAN/ccqs-architecture.md`). Pure, deterministic, no I/O — same
 * discipline as SEE's `applyScoringPolicy`. Every threshold is checked and reported individually
 * (`reasons[]`), never collapsed into an unexplained boolean.
 *
 * `maxNewMismatchCaseIds` inherently needs a baseline to compare against ("new" relative to what?)
 * — it is only checked when a `VersionComparisonReport` is supplied (comparing against a prior
 * run); otherwise it is honestly reported as not-evaluated (`actual: null, met: true`) rather than
 * silently assumed to pass on fabricated data.
 */
import type { GateReason, GateVerdict, QualityGatePolicy, QualityMetricSnapshot, VersionComparisonReport } from '../types';

/** A check within this fraction of its threshold, without violating it, is a soft "warn" signal. */
const WARN_MARGIN = 0.1;

function checkMin(key: string, actual: number | null, required: number, reasons: GateReason[]): boolean {
  const met = actual === null ? true : actual >= required;
  reasons.push({ thresholdKey: key, actual, required, met });
  return actual !== null && met && actual < required * (1 + WARN_MARGIN);
}

function checkMax(key: string, actual: number | null, required: number, reasons: GateReason[]): boolean {
  const met = actual === null ? true : actual <= required;
  reasons.push({ thresholdKey: key, actual, required, met });
  return actual !== null && met && actual > required * (1 - WARN_MARGIN);
}

export interface EvaluateGateOptions {
  replayRunId: string;
  decidedAt: string;
  /** Optional — enables the `maxNewMismatchCaseIds` check. Omitted checks are reported as
   *  not-evaluated (met: true, actual: null), never fabricated. */
  versionComparison?: VersionComparisonReport;
}

export function evaluateGate(
  metrics: QualityMetricSnapshot,
  policy: QualityGatePolicy,
  opts: EvaluateGateOptions
): GateVerdict {
  const reasons: GateReason[] = [];
  let anyWarn = false;

  anyWarn = checkMin('minCategoryAccuracy', metrics.categoryAccuracy, policy.thresholds.minCategoryAccuracy, reasons) || anyWarn;
  anyWarn = checkMin('minLocationAccuracy', metrics.locationAccuracy, policy.thresholds.minLocationAccuracy, reasons) || anyWarn;
  anyWarn = checkMax('maxAmbiguousRate', metrics.ambiguousRate, policy.thresholds.maxAmbiguousRate, reasons) || anyWarn;
  anyWarn = checkMax('maxFalsePositiveRate', metrics.falsePositiveRate, policy.thresholds.maxFalsePositiveRate, reasons) || anyWarn;

  if (opts.versionComparison) {
    anyWarn =
      checkMax('maxNewMismatchCaseIds', opts.versionComparison.regressedCount, policy.thresholds.maxNewMismatchCaseIds, reasons) ||
      anyWarn;
  } else {
    reasons.push({ thresholdKey: 'maxNewMismatchCaseIds', actual: null, required: policy.thresholds.maxNewMismatchCaseIds, met: true });
  }

  const failed = reasons.some((r) => !r.met);
  const verdict: GateVerdict['verdict'] = failed ? 'fail' : anyWarn ? 'warn' : 'pass';

  return {
    replayRunId: opts.replayRunId,
    gatePolicyId: policy.policyId,
    gatePolicyVersion: policy.policyVersion,
    verdict,
    reasons,
    decidedAt: opts.decidedAt,
  };
}
