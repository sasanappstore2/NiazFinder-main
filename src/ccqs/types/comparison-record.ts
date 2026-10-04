/**
 * ComparisonRecord — CCQS §1.4/§2 (`PLAN/ccqs-architecture.md`). Historical Record, frozen forever
 * once written (mirrors SEE's §16.2 discipline). Wraps SEE's own `ComparisonReport`/
 * `FinalEvaluation` verbatim, plus `ruleTrace` — data CCQS collects itself because SEE's adapters
 * deliberately don't carry per-candidate rule provenance (SEE §15.3's disclosed loss).
 */
import { z } from 'zod';
import { comparisonReportSchema, finalEvaluationSchema } from '@/semantic-evaluation-engine/types';

export const ruleTraceEntrySchema = z.object({
  fieldId: z.literal('category'),
  matchedRuleIds: z.array(z.string()),
});
export type RuleTraceEntry = z.infer<typeof ruleTraceEntrySchema>;

export const comparisonRecordSchema = z.object({
  id: z.string().min(1),
  replayRunId: z.string().min(1),
  caseId: z.string().min(1),
  comparisonReport: comparisonReportSchema,
  finalEvaluation: finalEvaluationSchema,
  ruleTrace: z.array(ruleTraceEntrySchema),
  createdAt: z.string(),
});
export type ComparisonRecord = z.infer<typeof comparisonRecordSchema>;
