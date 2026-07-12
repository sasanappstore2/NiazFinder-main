/**
 * PVW contracts — `PLAN/production-validation-window-architecture.md` §2.2/§3. Zod-first, like
 * every CCQS type. Two version axes minted by the PVW design (§2.3): `windowSpecVersion` (stamps
 * the bucketing definition) and `alertPolicyVersion` (stamps the threshold set an alert fired
 * under). Pillar B metrics are deliberately named AGREEMENT, never accuracy — production traffic
 * has no ground truth (PVW §2.1); agreement-with-legacy is a different, weaker signal and the
 * naming must not let anyone forget it.
 */
import { z } from 'zod';
import { confidenceHistogramSchema, ontologyRefinementStatSchema } from '../types/quality-metrics';

export const WINDOW_SPEC_VERSION = '1.0.0';
/** Daily UTC buckets. A change to bucketing is a NEW windowSpecVersion (PVW §2.3) — old
 *  CcqsMetricSnapshot rows stay valid under their original version, never reinterpreted. */
export function utcDayBucket(day: string): { bucketStart: Date; bucketEnd: Date } {
  const start = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error(`Invalid UTC day "${day}" — expected YYYY-MM-DD`);
  return { bucketStart: start, bucketEnd: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export const productionMetricSnapshotSchema = z.object({
  windowSpecVersion: z.string(),
  bucketStart: z.string(),
  bucketEnd: z.string(),
  totalEvents: z.number().int().min(0),
  /** Ground-truth-free: share of comparable fields whose status is match/refinement/
   *  semantic-equivalent — AGREEMENT with the legacy pipeline, not correctness. */
  agreementRateByField: z.record(z.string(), z.number().min(0).max(1).nullable()),
  ambiguousRate: z.number().min(0).max(1).nullable(),
  mismatchRate: z.number().min(0).max(1).nullable(),
  refinementRate: z.number().min(0).max(1).nullable(),
  statusCountsByField: z.record(z.string(), z.record(z.string(), z.number().int().min(0))),
  confidenceHistogramByField: z.record(z.string(), confidenceHistogramSchema),
  ontologyRefinementStats: z.array(ontologyRefinementStatSchema),
  topFailureReasons: z.array(z.object({ reasonCode: z.string(), count: z.number().int().min(0) })),
  /** Engine labels seen in version-stamped events; empty for pre-stamping history (G4 note). */
  engineLabelsSeen: z.array(z.string()),
});
export type ProductionMetricSnapshot = z.infer<typeof productionMetricSnapshotSchema>;

export const alertPolicySchema = z.object({
  alertPolicyId: z.string(),
  alertPolicyVersion: z.string(),
  thresholds: z.object({
    /** Golden pillar: release-comparison categoryAccuracy drop (percentage points as fraction). */
    maxCategoryAccuracyDrop: z.number(),
    /** Golden pillar: any regressed case in the release comparison fires. */
    maxRegressedCases: z.number().int(),
    /** Production pillar: daily ambiguousRate vs. rolling-7 average multiplier + absolute floor. */
    ambiguitySpikeMultiplier: z.number(),
    ambiguitySpikeFloor: z.number(),
    mismatchSpikeMultiplier: z.number(),
    mismatchSpikeFloor: z.number(),
    /** Production pillar: total-variation distance between weekly confidence histograms. */
    maxConfidenceTvDistance: z.number(),
    /** Production pillar: week-over-week location agreement drop. */
    maxLocationAgreementDrop: z.number(),
  }),
});
export type AlertPolicy = z.infer<typeof alertPolicySchema>;

export const alertDraftSchema = z.object({
  alertPolicyId: z.string(),
  alertPolicyVersion: z.string(),
  alertKey: z.string(),
  severity: z.enum(['critical', 'warning']),
  detail: z.record(z.string(), z.unknown()),
  sourceSnapshotIds: z.array(z.string()),
});
export type AlertDraft = z.infer<typeof alertDraftSchema>;

export interface TrendWindow {
  metricKey: string;
  windowLabel: 'last-day' | 'last-week' | 'last-month';
  startValue: number | null;
  endValue: number | null;
  delta: number | null;
  rollingAverage: number | null;
  sampleCount: number;
}
export interface TrendReport {
  asOf: string;
  windowSpecVersion: string;
  pillar: 'golden' | 'production';
  windows: TrendWindow[];
}
