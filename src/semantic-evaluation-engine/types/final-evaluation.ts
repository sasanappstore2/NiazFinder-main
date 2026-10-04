/**
 * FinalEvaluation — Layer 2 (Scoring Policy Engine) output. §4/§6/§16 (`PLAN/semantic-comparator-architecture.md`).
 *
 * Once persisted this is Historical Record for its identity fields (`evaluationId`,
 * `comparisonReportId`, `versionStamp`) and a cached Derived View for `perField`/`overallScore`/
 * `verdict` (pure arithmetic over two already-immutable inputs — the referenced `ComparisonReport`
 * and the pinned `ScoringPolicy` — see §16.2). Never mutated once written (INV-11/INV-16).
 *
 * Extends the architecture doc's illustrative §4 sketch with one field, `statusModifier`, found
 * necessary during Step 5's real implementation: without it, `weightedContribution`'s arithmetic
 * (`baseDrift(status) * weight * statusModifier`) could not be reconstructed from the stored data
 * alone — `weight` alone conflates the field's raw configured weight with the policy's per-status
 * multiplier, which are two independently meaningful numbers (INV-04-style explainability: every
 * number that fed a decision must be individually visible, not folded into another).
 */
import { z } from 'zod';
import { KNOWN_COMPARISON_STATUSES } from './comparison-report';
import { evaluationVersionStampSchema } from './versioning';

export const FINAL_EVALUATION_VERDICTS = ['acceptable', 'review-recommended', 'escalate'] as const;
export type FinalEvaluationVerdict = (typeof FINAL_EVALUATION_VERDICTS)[number];

export const finalEvaluationFieldSchema = z.object({
  fieldId: z.string().min(1),
  status: z.enum(KNOWN_COMPARISON_STATUSES),
  /** Raw ontology/geo distance when the field's strategy produced one; null otherwise (e.g.
   *  scalar-geo comparisons have no ontology relationship, hence no distance concept). Informational
   *  only — NOT an input to `weightedContribution`'s arithmetic, which uses `status` alone (§5). */
  distance: z.number().min(0).nullable(),
  /** The field's resolved raw weight (from `ScoringPolicy.fieldWeights`/`defaultWeight`), before
   *  any status-based adjustment. */
  weight: z.number().min(0),
  /** The resolved `statusWeightModifiers[status]` multiplier actually applied (1 if none configured). */
  statusModifier: z.number().min(0),
  /** = baseDriftAmount(status) * weight * statusModifier. */
  weightedContribution: z.number().min(0),
});
export type FinalEvaluationField = z.infer<typeof finalEvaluationFieldSchema>;

export const finalEvaluationSchema = z.object({
  evaluationId: z.string().min(1),
  comparisonReportId: z.string().min(1),
  versionStamp: evaluationVersionStampSchema,
  perField: z.array(finalEvaluationFieldSchema),
  overallScore: z.number().min(0),
  verdict: z.enum(FINAL_EVALUATION_VERDICTS),
});
export type FinalEvaluation = z.infer<typeof finalEvaluationSchema>;
