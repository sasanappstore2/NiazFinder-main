/**
 * default-v1 — CCQS §6 (`PLAN/ccqs-architecture.md`). Initial, honestly-undertuned starting
 * thresholds — not empirically derived yet, same discipline as SEE's `DEFAULT_SCORING_POLICY`.
 * Recalibrate once several real ReplayRuns exist to base real numbers on.
 */
import type { QualityGatePolicy } from '../types';

export const DEFAULT_GATE_POLICY: QualityGatePolicy = {
  policyId: 'default-v1',
  policyVersion: '1.0.0',
  thresholds: {
    minCategoryAccuracy: 0.85,
    minLocationAccuracy: 0.85,
    maxAmbiguousRate: 0.2,
    maxNewMismatchCaseIds: 0,
    maxFalsePositiveRate: 0.1,
  },
  isActive: true,
};
