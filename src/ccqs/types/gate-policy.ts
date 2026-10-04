/**
 * QualityGatePolicy / GateVerdict — CCQS §1.6/§6 (`PLAN/ccqs-architecture.md`). Mirrors SEE's
 * `ScoringPolicy` governance exactly (immutable once published, `PLAN/semantic-comparator-architecture.md`
 * §14.4) — a policy's thresholds never change in place; a change is always a new `policyVersion`.
 */
import { z } from 'zod';

export const qualityGateThresholdsSchema = z.object({
  minCategoryAccuracy: z.number().min(0).max(1),
  minLocationAccuracy: z.number().min(0).max(1),
  maxAmbiguousRate: z.number().min(0).max(1),
  maxNewMismatchCaseIds: z.number().int().min(0),
  maxFalsePositiveRate: z.number().min(0).max(1),
});
export type QualityGateThresholds = z.infer<typeof qualityGateThresholdsSchema>;

export const qualityGatePolicySchema = z.object({
  policyId: z.string().min(1),
  policyVersion: z.string().min(1),
  thresholds: qualityGateThresholdsSchema,
  isActive: z.boolean(),
});
export type QualityGatePolicy = z.infer<typeof qualityGatePolicySchema>;

export const GATE_VERDICTS = ['pass', 'fail', 'warn'] as const;
export type GateVerdictValue = (typeof GATE_VERDICTS)[number];

export const gateReasonSchema = z.object({
  thresholdKey: z.string(),
  actual: z.number().nullable(),
  required: z.number(),
  met: z.boolean(),
});
export type GateReason = z.infer<typeof gateReasonSchema>;

export const gateVerdictSchema = z.object({
  replayRunId: z.string().min(1),
  gatePolicyId: z.string().min(1),
  gatePolicyVersion: z.string().min(1),
  verdict: z.enum(GATE_VERDICTS),
  reasons: z.array(gateReasonSchema),
  decidedAt: z.string(),
});
export type GateVerdict = z.infer<typeof gateVerdictSchema>;
