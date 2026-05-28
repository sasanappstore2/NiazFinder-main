import { db } from '@/lib/db';
import type { NeedDraft } from '@/contracts/need-intake';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import {
  type CaptureTrainingInput,
  type IntakeAnalysisTrace,
  traceToAiResult,
} from '@/intake/training/trainingExample';
import { recordCandidateFailure } from '@/ai/analytics/candidateFailures';

function serializeJson(value: unknown): unknown {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value));
}

/**
 * Capture a training example after successful publish.
 * Never throws — failures are logged only.
 */
export async function captureTrainingExample(input: CaptureTrainingInput): Promise<void> {
  try {
    const { draft, serviceRequestId, intakeTrace } = input;
    const finalEntities = recordToEntities(draft.entities);
    const publishedCategory =
      finalEntities.subcategorySlug ?? finalEntities.categorySlug ?? null;

    let ruleResult: unknown = intakeTrace?.ruleResult ?? null;
    if (!ruleResult && draft.sourceText?.trim()) {
      const indexes = buildIntakeIndexesSync();
      ruleResult = analyzeNeedText(draft.sourceText, indexes);
    }

    const aiResult = traceToAiResult(intakeTrace ?? readTraceFromDraft(draft));

    if (intakeTrace?.candidates && publishedCategory) {
      void recordCandidateFailure({
        sourceText: draft.sourceText,
        expectedCategory: publishedCategory,
        candidateSlugs: intakeTrace.candidates.categories.map((c) => c.slug),
        aiSelectedCategory: intakeTrace.aiExtraction?.category ?? null,
        publishedCategory,
        serviceRequestId,
      });
    }

    await db.intakeTrainingExample.create({
      data: {
        sourceText: draft.sourceText,
        needType: draft.needType,
        ruleResult: serializeJson(ruleResult) as object,
        aiResult: serializeJson(aiResult) as object,
        finalEntities: serializeJson(draft.entities) as object,
        finalNeedDraft: serializeJson(stripDraftForStorage(draft)) as object,
        intakeTrace: serializeJson(intakeTrace ?? readTraceFromDraft(draft)) as object,
        serviceRequestId,
        publishedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[IntakeTrainingCapture] failed (non-blocking):', error);
  }
}

export function captureTrainingExampleAsync(input: CaptureTrainingInput): void {
  void captureTrainingExample(input);
}

function readTraceFromDraft(draft: NeedDraft): IntakeAnalysisTrace | null {
  const trace = (draft as NeedDraft & { intakeTrace?: IntakeAnalysisTrace }).intakeTrace;
  return trace ?? null;
}

function stripDraftForStorage(draft: NeedDraft): Partial<NeedDraft> {
  const { turns, ...rest } = draft;
  return {
    ...rest,
    turns: turns?.length ? [{ role: turns[0]!.role, content: '[truncated]' }] : [],
  };
}
