import {
  DEFAULT_LOCAL_LLM_MODEL,
  DEFAULT_LOCAL_LLM_URL,
  getLocalLlmBaseUrl,
  getLocalLlmModelId,
  getLocalLlmParallelSlots,
  getLocalLlmTimeoutMs,
  isLocalLlmOnly,
} from '@/lib/local-llm/config';

function resolveProvider():
  | 'ollama'
  | 'local-llm'
  | 'openai'
  | 'gemini'
  | 'mock' {
  if (isLocalLlmOnly()) return 'local-llm';
  const raw = (process.env.AI_PROVIDER ?? 'local-llm').trim().toLowerCase();
  if (raw === 'ollama') return 'local-llm';
  return raw as 'local-llm' | 'openai' | 'gemini' | 'mock';
}

export const AI_SEMANTIC_CONFIG = {
  enabled: process.env.AI_SEMANTIC_RESOLVER_ENABLED === 'true',
  confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD ?? '0.85'),
  localLlmUrl: getLocalLlmBaseUrl() || DEFAULT_LOCAL_LLM_URL,
  localLlmModel: getLocalLlmModelId() || DEFAULT_LOCAL_LLM_MODEL,
  localLlmParallelSlots: getLocalLlmParallelSlots(),
  provider: resolveProvider(),
  timeoutMs: getLocalLlmTimeoutMs(),
  maxRetries: parseInt(process.env.AI_MAX_RETRIES ?? '2', 10),
} as const;

export function getAiSemanticConfig() {
  return { ...AI_SEMANTIC_CONFIG };
}
