/**
 * applyScoringPolicy — the Scoring Policy Engine (Layer 2) entry point. §4/§16
 * (`PLAN/semantic-comparator-architecture.md`).
 *
 * Pure function: `(ComparisonReport, ScoringPolicy) -> FinalEvaluation`. Never touches `AI`, never
 * mutates its inputs, deterministic given the same report + same policy version (INV-01's spirit,
 * applied to Layer 2). `evaluationId`/`evaluationReportVersion` are supplied by the caller — same
 * purity pattern as the adapters (Step 3) and the Comparator (Step 4): no internal clock/randomness.
 *
 * `not-comparable` fields are excluded entirely from scoring (§3/§16) — they contribute zero
 * weight and zero score, not a zero-drift "match" and not a penalized "mismatch". This is the
 * direct payoff of Step 4's not-applicable reclassification: a field the original investigation
 * found was 68% poisoned by a test-harness artifact no longer drags the aggregate score at all.
 */
import type { ComparisonReport, ComparisonStatus, FinalEvaluation, ScoringPolicy } from '../types';

/**
 * v1 baseline drift-per-status, deliberately coarse (not distance-sensitive within a status) —
 * same "don't fabricate precision nothing backs yet" discipline as `decision-engine.ts`'s v1
 * scoring formula. Marketplace-specific fine-tuning happens via `statusWeightModifiers`, not by
 * inventing a distance-sensitive curve here with no empirical basis.
 */
const BASE_DRIFT_BY_STATUS: Record<Exclude<ComparisonStatus, 'not-comparable'>, number> = {
  match: 0,
  'semantic-equivalent': 0,
  refinement: 0.25,
  'ambiguous-but-plausible': 0.5,
  mismatch: 1,
  'contradiction-detected': 1,
};

export interface ApplyScoringPolicyOptions {
  evaluationId: string;
  evaluationReportVersion: string;
}

export function applyScoringPolicy(
  report: ComparisonReport,
  policy: ScoringPolicy,
  opts: ApplyScoringPolicyOptions
): FinalEvaluation {
  const perField: FinalEvaluation['perField'] = [];
  let weightedSum = 0;
  let weightSum = 0;

  for (const result of report.fieldResults) {
    if (result.status === 'not-comparable') continue;

    const baseDrift = BASE_DRIFT_BY_STATUS[result.status];
    const weight = policy.fieldWeights[result.fieldId] ?? policy.defaultWeight;
    const statusModifier = policy.statusWeightModifiers?.[result.status] ?? 1;
    const effectiveWeight = weight * statusModifier;
    const weightedContribution = baseDrift * effectiveWeight;

    perField.push({
      fieldId: result.fieldId,
      status: result.status,
      distance: result.relationship?.distance ?? null,
      weight,
      statusModifier,
      weightedContribution,
    });

    weightedSum += weightedContribution;
    weightSum += effectiveWeight;
  }

  // No comparable fields (or every effective weight was 0) -> nothing to judge; default to the
  // safest reading (0, "acceptable") rather than fabricating an alarm from an empty comparison.
  const overallScore = weightSum > 0 ? weightedSum / weightSum : 0;
  const verdict: FinalEvaluation['verdict'] =
    overallScore <= policy.thresholds.acceptableMaxScore
      ? 'acceptable'
      : overallScore >= policy.thresholds.escalateMinScore
        ? 'escalate'
        : 'review-recommended';

  return {
    evaluationId: opts.evaluationId,
    comparisonReportId: report.reportId,
    versionStamp: {
      ...report.versionStamp,
      scoringPolicyId: policy.policyId,
      scoringPolicyVersion: policy.policyVersion,
      evaluationReportVersion: opts.evaluationReportVersion,
    },
    perField,
    overallScore,
    verdict,
  };
}
