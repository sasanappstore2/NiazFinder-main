/** OpenAI-compatible local LLM gateway (LM Studio on :1234). */

import {
  DEFAULT_LOCAL_LLM_MODEL,
  DEFAULT_LOCAL_LLM_URL,
  getLocalLlmBaseUrl,
  getLocalLlmModelId,
  getLocalLlmTimeoutMs,
  isLocalLlmOnly,
} from '@/lib/local-llm/config';

export interface LocalModelConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

export function getLocalModelConfig(): LocalModelConfig {
  const base = getLocalLlmBaseUrl() || DEFAULT_LOCAL_LLM_URL;

  return {
    baseUrl: base,
    model: getLocalLlmModelId() || DEFAULT_LOCAL_LLM_MODEL,
    timeoutMs: getLocalLlmTimeoutMs(),
    maxRetries: Number(process.env.AI_MAX_RETRIES ?? 2),
  };
}

export { getLocalLlmBaseUrl, getLocalLlmModelId, isLocalLlmOnly };

export function localModelChatUrl(config?: LocalModelConfig): string {
  const c = config ?? getLocalModelConfig();
  return `${c.baseUrl}/v1/chat/completions`;
}

export function localModelModelsUrl(config?: LocalModelConfig): string {
  const c = config ?? getLocalModelConfig();
  return `${c.baseUrl}/v1/models`;
}
