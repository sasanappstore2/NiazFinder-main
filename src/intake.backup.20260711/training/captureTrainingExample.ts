import type { FieldState } from '@/intake/intelligence-engine/types';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { detectCorrections } from '@/intake/training/detectCorrections';
import { getTelemetryForSession } from '@/intake/training/getSessionTelemetry';
import {
  hashSourceText,
  sanitizeDraftForTraining,
  stripTrainingPii,
} from '@/intake/training/sanitizeTrainingData';
import type { CaptureTrainingInput } from '@/intake/training/types';

function splitFieldMeta(fieldMeta: Record<string, FieldState> | undefined): {
  ruleResult: Record<string, unknown>;
  aiResult: Record<string, unknown>;
} {
  const ruleResult: Record<string, unknown> = {};
  const aiResult: Record<string, unknown> = {};
  if (!fieldMeta) return { ruleResult, aiResult };

  for (const [key, state] of Object.entries(fieldMeta)) {
    const entry = {
      value: state.value,
      confidence: state.confidence,
      source: state.source,
      evidence: state.evidence,
    };
    if (state.source === 'ai') {
      aiResult[key] = entry;
    } else if (state.source === 'rule' || state.source === 'dictionary' || state.source === 'resolver') {
      ruleResult[key] = entry;
    }
  }

  if (fieldMeta && Object.keys(aiResult).length === 0) {
    for (const [key, state] of Object.entries(fieldMeta)) {
      if (state.source !== 'user') ruleResult[key] = ruleResult[key] ?? {
        value: state.value,
        confidence: state.confidence,
        source: state.source,
      };
    }
  }

  return { ruleResult, aiResult };
}

function buildIntakeTrace(input: CaptureTrainingInput) {
  const snapshot = input.draft.analysisSnapshot;
  return {
    ...(typeof input.draft.intakeTrace === 'object' && input.draft.intakeTrace
      ? input.draft.intakeTrace
      : {}),
    analysisSnapshot: snapshot ?? null,
    telemetryEventCount: input.telemetryEvents?.length ?? 0,
    sessionId: input.sessionId ?? null,
  };
}

/**
 * Persist intake publish as training example (non-blocking caller).
 * Returns created id or null on skip/error.
 */
export async function captureTrainingExample(input: CaptureTrainingInput): Promise<string | null> {
  const rawText =
    String(input.draft.sourceText ?? '').trim() ||
    String(input.draft.analysisSnapshot?.sourceText ?? '').trim();
  if (!rawText) return null;

  const sourceText = stripTrainingPii(rawText);
  const sourceTextHash = hashSourceText(sourceText);

  const existing = await db.intakeTrainingExample.findFirst({
    where: {
      sourceTextHash,
      publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (existing) return null;

  const duplicateRequest = await db.intakeTrainingExample.findUnique({
    where: { serviceRequestId: input.serviceRequestId },
    select: { id: true },
  });
  if (duplicateRequest) return duplicateRequest.id;

  const finalEntities = { ...input.draft.entities };
  const telemetryEvents =
    input.telemetryEvents ?? (input.sessionId ? await getTelemetryForSession(input.sessionId) : []);

  const correction = detectCorrections({
    finalEntities,
    analysisSnapshot: input.draft.analysisSnapshot,
    fieldMeta: input.draft.fieldMeta as Record<string, { value?: unknown; source?: string }>,
    telemetryEvents,
  });

  const fieldMeta = input.draft.analysisSnapshot?.fieldMeta;
  const { ruleResult, aiResult } = splitFieldMeta(fieldMeta);

  if (input.draft.analysisSnapshot?.intentGist) {
    aiResult.intentGist = input.draft.analysisSnapshot.intentGist;
    aiResult.intentGistProvider = input.draft.analysisSnapshot.intentGistProvider ?? null;
  }

  const row = await db.intakeTrainingExample.create({
    data: {
      sourceText,
      needType: input.draft.templateId,
      ruleResult: Object.keys(ruleResult).length
        ? (ruleResult as Prisma.InputJsonValue)
        : undefined,
      aiResult: Object.keys(aiResult).length ? (aiResult as Prisma.InputJsonValue) : undefined,
      finalEntities: finalEntities as Prisma.InputJsonValue,
      finalNeedDraft: sanitizeDraftForTraining(
        input.draft as Record<string, unknown>
      ) as Prisma.InputJsonValue,
      intakeTrace: buildIntakeTrace({ ...input, telemetryEvents }) as Prisma.InputJsonValue,
      serviceRequestId: input.serviceRequestId,
      correctedEntities: correction.correctedEntities as Prisma.InputJsonValue,
      qualityFlags: correction.qualityFlags,
      sourceTextHash,
      sessionId: input.sessionId ?? null,
      hasUserCorrections: correction.hasUserCorrections,
      correctionFields: correction.correctionFields,
    },
  });

  return row.id;
}

/** Fire-and-forget wrapper — never throws to caller. */
export function captureTrainingExampleAsync(input: CaptureTrainingInput): void {
  void captureTrainingExample(input).catch((err) => {
    console.error('[intake-training] capture failed', err);
  });
}
