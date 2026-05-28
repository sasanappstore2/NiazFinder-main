import type { NeedDraft } from '@/contracts/need-intake';
import type { IntakeAnalysisResult, IntakeEntities } from '@/intake/types';
import type { AiCandidateRetrievalSet, AiExtractionRaw } from '@/ai/types';

/** Snapshot stored on NeedDraft during analyze — forwarded to publish capture. */
export interface IntakeAnalysisTrace {
  ruleResult: IntakeAnalysisResult;
  aiInvoked: boolean;
  aiExtraction: AiExtractionRaw | null;
  validatedPatch: Partial<IntakeEntities> | null;
  validationRejects: Array<{ field: string; value: unknown; reason: string }>;
  candidates: AiCandidateRetrievalSet | null;
  aiProvider: string | null;
  aiLatencyMs: number;
  ruleConfidence: number;
  capturedAt: string;
}

/** Canonical training example — mirrors DB + API shape. */
export interface IntakeTrainingExample {
  id: string;
  sourceText: string;
  needType: string | null;
  ruleResult: unknown;
  aiResult: unknown;
  finalEntities: unknown;
  finalNeedDraft: unknown;
  intakeTrace?: unknown;
  serviceRequestId: string | null;
  publishedAt: string;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt?: string | null;
  correctedEntities: unknown | null;
}

export interface CaptureTrainingInput {
  draft: NeedDraft;
  serviceRequestId: string;
  intakeTrace?: IntakeAnalysisTrace | null;
}

export interface GoldDatasetEntry {
  text: string;
  expected: {
    category?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    transactionType?: string | null;
    vertical?: string | null;
  };
  sourceExampleId?: string;
}

export function entitySlugSummary(entities: Record<string, unknown>) {
  return {
    category: (entities.subcategorySlug ?? entities.categorySlug) as string | null,
    city: entities.citySlug as string | null,
    neighborhood: entities.neighborhoodSlug as string | null,
    transactionType: entities.transactionType as string | null,
    vertical: entities.vertical as string | null,
  };
}

export function traceToAiResult(trace: IntakeAnalysisTrace | null | undefined) {
  if (!trace?.aiInvoked) return null;
  return {
    extraction: trace.aiExtraction,
    validatedPatch: trace.validatedPatch,
    validationRejects: trace.validationRejects,
    candidates: trace.candidates,
    provider: trace.aiProvider,
    latencyMs: trace.aiLatencyMs,
  };
}
