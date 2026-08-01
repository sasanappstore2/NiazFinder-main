/**
 * ScoringPolicy — Layer 2 (Scoring Policy Engine) contract. §4 (`PLAN/semantic-comparator-architecture.md`).
 * Pure data (JSON-serializable, no functions) — deterministic given a policy version (INV-09: the
 * Comparator/Layer 1 never sees any of this; importance-assignment lives here exclusively).
 */
import { z } from 'zod';
import { KNOWN_COMPARISON_STATUSES } from './comparison-report';

export const policyScopeSchema = z.union([
  z.object({ global: z.literal(true) }),
  z.object({ marketplaceVertical: z.string().min(1) }),
  z.object({ categoryBranch: z.string().min(1) }),
]);
export type PolicyScope = z.infer<typeof policyScopeSchema>;

export const scoringPolicySchema = z.object({
  policyId: z.string().min(1),
  policyVersion: z.string().min(1),
  appliesTo: policyScopeSchema,
  fieldWeights: z.record(z.string(), z.number().min(0)),
  defaultWeight: z.number().min(0),
  /** Multiplies a field's resolved weight for a specific outcome status — e.g. a vertical may
   *  decide a `refinement` barely matters (0.2) while a `contradiction-detected` matters twice as
   *  much as an ordinary `mismatch` (2.0). Absent status -> multiplier of 1 (no adjustment). */
  statusWeightModifiers: z.record(z.enum(KNOWN_COMPARISON_STATUSES), z.number().min(0)).optional(),
  thresholds: z.object({
    acceptableMaxScore: z.number().min(0),
    escalateMinScore: z.number().min(0),
  }),
});
export type ScoringPolicy = z.infer<typeof scoringPolicySchema>;

/** Input to policy resolution — not a persisted contract, so plain TS rather than Zod. */
export interface PolicyResolutionContext {
  marketplaceVertical?: string;
  categoryBranch?: string;
}
