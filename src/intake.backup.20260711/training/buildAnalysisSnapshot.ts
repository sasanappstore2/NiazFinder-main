import type { NeedDraft } from '@/contracts/need-intake';
import type { IntakeAnalyzeResponse } from '@/intake/api/intake.dto';
import type { FieldState } from '@/intake/intelligence-engine/types';
import type { IntakeAnalysisSnapshot } from '@/intake/training/types';

/** Build training snapshot from analyze API response. */
export function buildAnalysisSnapshot(
  res: IntakeAnalyzeResponse,
  sourceText: string
): IntakeAnalysisSnapshot {
  const meta = (res.meta ?? {}) as Record<string, unknown>;
  const fieldMeta =
    ((res as { fieldMeta?: Record<string, FieldState> }).fieldMeta as Record<string, FieldState>) ??
    {};

  const resAny = res as IntakeAnalyzeResponse & {
    draft?: NeedDraft;
    categoryCandidates?: IntakeAnalysisSnapshot['categoryCandidates'];
    cityCandidates?: IntakeAnalysisSnapshot['cityCandidates'];
  };

  return {
    predictedAt: new Date().toISOString(),
    sourceText,
    normalizedText: String(res.normalizedText ?? sourceText),
    intentGist: (meta.intentGist as string | null | undefined) ?? null,
    intentGistProvider: (meta.intentGistProvider as string | null | undefined) ?? null,
    fieldMeta,
    recommendedQuestions: res.recommendedQuestions ?? [],
    categoryCandidates:
      resAny.categoryCandidates ?? resAny.draft?.parsedIntent?.categoryCandidates,
    cityCandidates: resAny.cityCandidates ?? resAny.draft?.parsedIntent?.cityCandidates,
    missingFields: res.missingFields ?? [],
    engine: String(meta.engine ?? 'intake-intelligence'),
    aiInvoked: Boolean(meta.aiInvoked),
    traceId: (meta.traceId as string | null | undefined) ?? null,
    truthVerification: meta.truthVerification ?? null,
  };
}

/** Attach snapshot + fieldMeta to draft after analyze. */
export function draftWithAnalysisSnapshot(
  draft: NeedDraft,
  res: IntakeAnalyzeResponse,
  sourceText: string
): NeedDraft {
  const snapshot = buildAnalysisSnapshot(res, sourceText);
  const fieldMeta = snapshot.fieldMeta;
  return {
    ...draft,
    analysisSnapshot: snapshot,
    fieldMeta: Object.fromEntries(
      Object.entries(fieldMeta).map(([k, v]) => [
        k,
        {
          value: v.value,
          confidence: v.confidence,
          source: v.source,
          evidence: v.evidence,
        },
      ])
    ),
  };
}
