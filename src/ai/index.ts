export { getAiSemanticConfig, AI_SEMANTIC_CONFIG } from '@/ai/config/feature-flags';
export type {
  AiProviderName,
  AiExtractionRaw,
  ResolveIntakeInput,
  ResolveIntakeResult,
  SemanticResolverResult,
  AiIntakeCandidates,
} from '@/ai/types';
export type { AiProvider } from '@/ai/providers/base';
export { createAiProvider, getAiProvider, routeAiResolve } from '@/ai/router/aiRouter';
export { runSemanticResolver, validateRawAiJson } from '@/ai/services/semanticResolver';
export { mergeRuleAndAiEntities } from '@/ai/services/mergeEntities';
export { buildIntakeCandidates } from '@/ai/services/candidateBuilder';
export { retrieveIntakeCandidates, toLegacyCandidates } from '@/ai/services/candidateRetrieval';
export { computeCombinedConfidence } from '@/ai/services/candidateConfidence';
export {
  safeParseConstrainedSelection,
  constrainedSelectionSchema,
  safeParseAiExtraction,
  aiExtractionSchema,
} from '@/ai/schema/extractionSchema';
export {
  validateConstrainedSelection,
  validateAiExtraction,
} from '@/ai/schema/validationSchema';
export { loadEvaluationDataset } from '@/ai/evaluation/datasetLoader';
export {
  runIntakeAiEvaluation,
} from '@/ai/evaluation/evaluationRunner';
export {
  formatAccuracyReport,
  buildEvaluationMetrics,
} from '@/ai/evaluation/accuracyReport';
export type { AiCandidateRetrievalSet } from '@/ai/types';
export { getAiMetricsSnapshot, resetAiMetricsForTests } from '@/ai/observability/metrics';
export { OllamaAiProvider } from '@/ai/providers/ollamaProvider';
export { LocalChatAiProvider } from '@/ai/providers/localChatProvider';
export { MockAiProvider } from '@/ai/providers/mockProvider';
