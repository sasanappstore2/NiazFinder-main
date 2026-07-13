/**
 * QualityMetricSnapshot — CCQS §1.5/§3 (`PLAN/ccqs-architecture.md`). Derived View, cached for
 * convenience (mirrors SEE's §16.2 discipline: mechanically re-derivable from `ComparisonRecord`s
 * with zero information loss — never more authoritative than the records it summarizes).
 */
import { z } from 'zod';

export const confidenceHistogramSchema = z.object({
  /** 10 deciles: buckets[i] = count of confidences in [i/10, (i+1)/10). */
  buckets: z.array(z.number().int().min(0)).length(10),
  count: z.number().int().min(0),
});
export type ConfidenceHistogram = z.infer<typeof confidenceHistogramSchema>;

export const ontologyRefinementStatSchema = z.object({
  reasonCode: z.string(),
  count: z.number().int().min(0),
});
export type OntologyRefinementStat = z.infer<typeof ontologyRefinementStatSchema>;

export const ruleCoverageSchema = z.object({
  totalUniqueRulesMatched: z.number().int().min(0),
  /** Golden case ids where the category field produced zero rule matches at all — the permanent,
   *  automatic generalization of this session's "موتور سیکلت" investigation. */
  zeroCandidateCaseIds: z.array(z.string()),
});
export type RuleCoverage = z.infer<typeof ruleCoverageSchema>;

export const qualityMetricSnapshotSchema = z.object({
  replayRunId: z.string().min(1),
  computedAt: z.string(),
  totalCases: z.number().int().min(0),
  /** null when there are zero comparable cases for this field — never fabricated as 0 or 1. */
  categoryAccuracy: z.number().min(0).max(1).nullable(),
  locationAccuracy: z.number().min(0).max(1).nullable(),
  /** ALWAYS null today — no intent classifier exists in the Cognitive Engine yet (§3 #8 of the
   *  CCQS doc). Wired, not fabricated; activates the day a real classifier exists. */
  intentAccuracy: z.number().min(0).max(1).nullable(),
  ambiguousRate: z.number().min(0).max(1).nullable(),
  /** Golden-dataset-only (needs ground truth) — null for production-shadow runs. */
  falsePositiveRate: z.number().min(0).max(1).nullable(),
  falseNegativeRate: z.number().min(0).max(1).nullable(),
  confidenceHistogramByField: z.record(z.string(), confidenceHistogramSchema),
  ontologyRefinementStats: z.array(ontologyRefinementStatSchema),
  ruleCoverage: ruleCoverageSchema,
  statusCountsByField: z.record(z.string(), z.record(z.string(), z.number().int().min(0))),
});
export type QualityMetricSnapshot = z.infer<typeof qualityMetricSnapshotSchema>;
