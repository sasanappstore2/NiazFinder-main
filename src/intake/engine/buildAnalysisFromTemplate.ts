import type {
  IntakeAnalysisResult,
  IntakeConfidence,
  IntakeEntities,
} from '@/intake/types';
import type { EntityValueContext } from '@/intake/entities/entityRegistry';
import { buildNextQuestion } from '@/intake/wizard/wizardBuilder';
import {
  buildPrioritizedMissingFields,
  completionStateFromScore,
  computeCompletionScore,
} from '@/intake/schema/needSchema';
import { computeMatchabilityScore } from '@/intake/scoring/matchabilityEngine';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';

export function buildAnalysisFromEntities(
  entities: IntakeEntities,
  confidence: IntakeConfidence,
  normalizedText: string,
  started: number,
  ctx?: EntityValueContext
): IntakeAnalysisResult {
  const template = resolveTemplateFromDraftEntities(entities);
  const valueCtx: EntityValueContext = {
    ...ctx,
    sourceText: ctx?.sourceText ?? normalizedText,
  };
  const missingFields = buildPrioritizedMissingFields(entities, valueCtx);
  const nextQuestion = buildNextQuestion(entities, missingFields);
  const completionScore = computeCompletionScore(missingFields);
  const matchabilityScore = computeMatchabilityScore(entities);
  const completionState = completionStateFromScore(completionScore);

  return {
    entities,
    confidence,
    templateId: template.id,
    templateVersion: template.schemaVersion,
    rootSlug: template.rootSlug,
    categoryPath: template.categoryPath,
    detectedVertical: entities.vertical ?? template.vertical,
    detectedCategory: entities.category ?? template.category,
    missingFields,
    nextQuestion,
    recommendedQuestions: missingFields.map((f) => f.field),
    completionScore,
    matchabilityScore,
    completionState,
    sections: template.sections.map((s) => ({
      key: s.key,
      label: s.label,
      fields: [...s.fields],
    })),
    normalizedText,
    latencyMs: Math.round(performance.now() - started),
  };
}
