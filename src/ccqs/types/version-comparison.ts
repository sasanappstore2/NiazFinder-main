/**
 * VersionComparisonReport — CCQS §5 (`PLAN/ccqs-architecture.md`). Mechanically answers every
 * Regression Protection question: improved/regressed counts, per-field/per-ontology-relationship
 * diffs, confidence shifts — all derived from two ReplayRuns' already-explainable ComparisonRecords
 * (SEE's INV-04 explainability guarantee is what makes "exactly why" free here).
 */
import { z } from 'zod';

export const CASE_DIFF_CLASSIFICATIONS = [
  'improved',
  'regressed',
  'unchanged',
  'newly-comparable',
  'newly-not-comparable',
] as const;
export type CaseDiffClassification = (typeof CASE_DIFF_CLASSIFICATIONS)[number];

const fieldOutcomeSchema = z.object({ status: z.string(), reasonCode: z.string() });

export const caseDiffSchema = z.object({
  caseId: z.string(),
  fieldId: z.string(),
  before: fieldOutcomeSchema.nullable(),
  after: fieldOutcomeSchema.nullable(),
  classification: z.enum(CASE_DIFF_CLASSIFICATIONS),
});
export type CaseDiff = z.infer<typeof caseDiffSchema>;

export const metricDeltaSchema = z.object({
  before: z.number().nullable(),
  after: z.number().nullable(),
  delta: z.number().nullable(),
});
export type MetricDelta = z.infer<typeof metricDeltaSchema>;

export const versionComparisonReportSchema = z.object({
  runAId: z.string().min(1),
  runBId: z.string().min(1),
  metricDeltas: z.record(z.string(), metricDeltaSchema),
  caseDiffs: z.array(caseDiffSchema),
  improvedCount: z.number().int().min(0),
  regressedCount: z.number().int().min(0),
  unchangedCount: z.number().int().min(0),
});
export type VersionComparisonReport = z.infer<typeof versionComparisonReportSchema>;
