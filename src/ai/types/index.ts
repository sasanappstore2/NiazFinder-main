import type { IntakeAnalysisResult, IntakeConfidence, IntakeEntities } from '@/intake/types';

export type AiProviderName =
  | 'ollama'
  | 'local-llm'
  | 'openai'
  | 'gemini'
  | 'claude'
  | 'qwen'
  | 'deepseek'
  | 'mock';

export interface AiCandidateCategory {
  slug: string;
  title: string;
  rankScore?: number;
}

export interface AiCandidateCity {
  id: string;
  slug: string;
  name: string;
  rankScore?: number;
}

export interface AiCandidateNeighborhood {
  slug: string;
  name: string;
  cityId: string;
  cityName: string;
  rankScore?: number;
}

export interface AiCandidateTransactionType {
  value: string;
  label: string;
}

export interface AiCandidateRetrievalSet {
  categories: AiCandidateCategory[];
  cities: AiCandidateCity[];
  neighborhoods: AiCandidateNeighborhood[];
  transactionTypes: AiCandidateTransactionType[];
  retrievalCount: number;
}

/** @deprecated Use AiCandidateRetrievalSet */
export interface AiIntakeCandidates {
  categories: AiCandidateCategory[];
  cities: AiCandidateCity[];
  neighborhoods: AiCandidateNeighborhood[];
  transactionTypes?: AiCandidateTransactionType[];
}

/** Raw structured output from an AI provider (before registry validation). */
export interface AiExtractionRaw {
  category: string | null;
  city: string | null;
  neighborhood: string | null;
  transactionType: string | null;
  budget: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  rahnAmount?: number | null;
  monthlyRent?: number | null;
  deposit?: number | null;
  area: number | null;
  rooms: number | null;
  confidence: number;
}

export interface ResolveIntakeInput {
  text: string;
  normalizedText: string;
  ruleResult: IntakeAnalysisResult;
  candidates: AiCandidateRetrievalSet;
}

export interface AiProviderError {
  code: 'TIMEOUT' | 'UNAVAILABLE' | 'INVALID_RESPONSE' | 'PARSE_ERROR' | 'UNKNOWN';
  message: string;
  retryable: boolean;
}

import type { CombinedFieldConfidence } from '@/ai/services/candidateConfidence';

export interface ResolveIntakeResult {
  ok: boolean;
  provider: AiProviderName;
  extraction: AiExtractionRaw | null;
  validatedEntities: Partial<IntakeEntities> | null;
  validationRejects?: Array<{ field: string; value: unknown; reason: string }>;
  fieldConfidence?: CombinedFieldConfidence;
  error: AiProviderError | null;
  latencyMs: number;
  rawResponse?: string;
}

export interface SemanticResolverResult {
  ruleEngine: IntakeAnalysisResult;
  aiExtraction: AiExtractionRaw | null;
  validatedPatch: Partial<IntakeEntities> | null;
  mergedResult: IntakeAnalysisResult;
  provider: AiProviderName | null;
  aiLatencyMs: number;
  aiInvoked: boolean;
  aiError: AiProviderError | null;
  candidates: AiCandidateRetrievalSet | null;
  validationRejects: Array<{ field: string; value: unknown; reason: string }>;
}

export interface AiMetricsSnapshot {
  requests: number;
  successes: number;
  failures: number;
  totalLatencyMs: number;
  byProvider: Record<string, { requests: number; successes: number; failures: number }>;
}

export type { IntakeConfidence, IntakeEntities, IntakeAnalysisResult };
