import type { IntakeAnalysisResult, IntakeConfidence, IntakeEntities, IntakeIndexes } from '@/intake/types';
import type { AiProvider } from '@/ai/providers/base';
import type { AiCandidateRetrievalSet } from '@/ai/types';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { recordAiRequest, recordCandidateRetrieval } from '@/ai/observability/metrics';
import { routeAiResolve } from '@/ai/router/aiRouter';
import { retrieveIntakeCandidates } from '@/ai/services/candidateRetrieval';
import { mergeRuleAndAiEntities } from '@/ai/services/mergeEntities';
import type { SemanticResolverResult } from '@/ai/types';
import { safeParseConstrainedSelection } from '@/ai/schema/extractionSchema';
import {
  validateConstrainedSelection,
} from '@/ai/schema/validationSchema';
import { overallConfidence } from '@/intake/scoring/confidenceEngine';
import {
  buildPrioritizedMissingFields,
  completionStateFromScore,
  computeCompletionScore,
} from '@/intake/schema/needSchema';
import { computeMatchabilityScore } from '@/intake/scoring/matchabilityEngine';
import { resolveNeedType } from '@/intake/schema/needTypes';
import { buildNextQuestion } from '@/intake/wizard/wizardBuilder';

function finalizeAnalysis(
  entities: IntakeEntities,
  confidence: IntakeConfidence,
  normalizedText: string,
  started: number
): IntakeAnalysisResult {
  const missingFields = buildPrioritizedMissingFields(entities);
  const needType = resolveNeedType(entities);
  const completionScore = computeCompletionScore(missingFields);

  return {
    entities,
    confidence,
    needType: needType.key,
    detectedVertical: entities.vertical,
    detectedCategory: entities.category,
    missingFields,
    nextQuestion: buildNextQuestion(entities, missingFields),
    recommendedQuestions: missingFields.map((f) => f.field),
    completionScore,
    matchabilityScore: computeMatchabilityScore(entities),
    completionState: completionStateFromScore(completionScore),
    sections: needType.sections.map((s) => ({
      key: s.key,
      label: s.label,
      fields: [...s.fields],
    })),
    normalizedText,
    latencyMs: Math.round(performance.now() - started),
  };
}

export interface SemanticResolverOptions {
  forceAi?: boolean;
  providerOverride?: string;
  provider?: AiProvider;
  candidatesOverride?: AiCandidateRetrievalSet;
}

export async function runSemanticResolver(
  ruleResult: IntakeAnalysisResult,
  text: string,
  indexes: IntakeIndexes,
  tokens: readonly string[],
  ngrams: readonly string[],
  options: SemanticResolverOptions = {}
): Promise<SemanticResolverResult> {
  const config = getAiSemanticConfig();
  const started = performance.now();
  const ruleConfidence = overallConfidence(ruleResult.confidence);

  const shouldInvokeAi =
    options.forceAi || (config.enabled && ruleConfidence < config.confidenceThreshold);

  if (!shouldInvokeAi) {
    return {
      ruleEngine: ruleResult,
      aiExtraction: null,
      validatedPatch: null,
      mergedResult: ruleResult,
      provider: null,
      aiLatencyMs: 0,
      aiInvoked: false,
      aiError: null,
      candidates: null,
      validationRejects: [],
    };
  }

  const candidates =
    options.candidatesOverride ??
    retrieveIntakeCandidates(indexes, tokens, ngrams, ruleResult);
  recordCandidateRetrieval(candidates.retrievalCount);

  const providerResult = options.provider
    ? await options.provider.resolveIntake({
        text,
        normalizedText: ruleResult.normalizedText,
        ruleResult,
        candidates,
      })
    : await routeAiResolve(
        {
          text,
          normalizedText: ruleResult.normalizedText,
          ruleResult,
          candidates,
        },
        options.providerOverride
      );

  recordAiRequest(providerResult.provider, providerResult.latencyMs, providerResult.ok);

  if (!providerResult.ok || !providerResult.validatedEntities) {
    return {
      ruleEngine: ruleResult,
      aiExtraction: providerResult.extraction,
      validatedPatch: providerResult.validatedEntities,
      mergedResult: ruleResult,
      provider: providerResult.provider,
      aiLatencyMs: providerResult.latencyMs,
      aiInvoked: true,
      aiError: providerResult.error,
      candidates,
      validationRejects: providerResult.validationRejects ?? [],
    };
  }

  const mergedEntities = mergeRuleAndAiEntities(
    ruleResult.entities,
    providerResult.validatedEntities
  );

  const mergedConfidence: IntakeConfidence = {
    ...ruleResult.confidence,
    ...(providerResult.fieldConfidence
      ? {
          category: providerResult.fieldConfidence.category,
          city: providerResult.fieldConfidence.city,
          neighborhood: providerResult.fieldConfidence.neighborhood,
          transactionType: providerResult.fieldConfidence.transactionType,
        }
      : {}),
  };

  const mergedResult = finalizeAnalysis(
    mergedEntities,
    mergedConfidence,
    ruleResult.normalizedText,
    started
  );

  return {
    ruleEngine: ruleResult,
    aiExtraction: providerResult.extraction,
    validatedPatch: providerResult.validatedEntities,
    mergedResult,
    provider: providerResult.provider,
    aiLatencyMs: providerResult.latencyMs,
    aiInvoked: true,
    aiError: null,
    candidates,
    validationRejects: providerResult.validationRejects ?? [],
  };
}

export function validateRawAiJson(
  raw: string,
  candidates: ReturnType<typeof retrieveIntakeCandidates>
) {
  const parsed = safeParseConstrainedSelection(raw);
  if (!parsed) return { extraction: null, validated: null, rejects: [] };
  const result = validateConstrainedSelection(parsed, candidates);
  return {
    extraction: parsed,
    validated: result.patch,
    rejects: result.rejects,
  };
}
