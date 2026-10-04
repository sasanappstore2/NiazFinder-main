/**
 * default-v1 — §4/§12 step 5 (`PLAN/semantic-comparator-architecture.md`): "exactly one policy to
 * start, global scope, weights matching today's implicit equal-weighting" — proves the Layer 1/
 * Layer 2 boundary works before any real marketplace-specific policy is authored.
 *
 * Threshold values (0.3 / 0.6) are an initial, honestly-undertuned v1 starting point — not
 * empirically derived yet, same discipline as `decision-engine.ts`'s v1 scoring formula (documented
 * as provisional rather than silently presented as final). Recalibrate once Step 7's real
 * shadow-batch data is available.
 */
import type { ScoringPolicy } from '../types';

export const DEFAULT_SCORING_POLICY: ScoringPolicy = {
  policyId: 'default-v1',
  policyVersion: '1.0.0',
  appliesTo: { global: true },
  fieldWeights: {},
  defaultWeight: 1,
  thresholds: {
    acceptableMaxScore: 0.3,
    escalateMinScore: 0.6,
  },
};
