/**
 * Version stamps — SEE architecture §6 (`PLAN/semantic-comparator-architecture.md`).
 *
 * Five independently-versioned axes. Every persisted `ComparisonReport` (Layer 1) and
 * `FinalEvaluation` (Layer 2) carries the exact version tuple that produced it, so a historical
 * result can be replayed byte-for-byte (INV-07) without ever retroactively changing when the
 * engine, a policy, or an ontology provider is later upgraded (INV-11).
 */
import { z } from 'zod';

export const comparatorVersionStampSchema = z.object({
  /** Version of the Layer-1 comparison algorithms (state-compatibility matrix, strategy handlers). */
  comparatorEngineVersion: z.string().min(1),
  /** Version of the SemanticSnapshot/SemanticFieldValue/SemanticValue wire schema. */
  semanticContractVersion: z.string().min(1),
  /** namespace -> OntologyProvider.version, for every provider consulted during this comparison. */
  ontologyVersions: z.record(z.string(), z.string()),
});
export type ComparatorVersionStamp = z.infer<typeof comparatorVersionStampSchema>;

export const evaluationVersionStampSchema = comparatorVersionStampSchema.extend({
  scoringPolicyId: z.string().min(1),
  scoringPolicyVersion: z.string().min(1),
  /** Version of the ComparisonReport/FinalEvaluation *output* schema (data-at-rest format). */
  evaluationReportVersion: z.string().min(1),
});
export type EvaluationVersionStamp = z.infer<typeof evaluationVersionStampSchema>;
