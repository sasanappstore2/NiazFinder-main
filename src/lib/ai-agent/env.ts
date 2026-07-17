import {
  DEFAULT_LOCAL_LLM_MODEL,
  DEFAULT_LOCAL_LLM_URL,
  getLocalLlmBaseUrl,
  getLocalLlmModelId,
  isLocalLlmOnly,
} from '@/lib/local-llm/config';

export function isAiAgentEnabled(): boolean {
  return process.env.AI_AGENT_ENABLED === 'true';
}

export function agentMessageFeeToman(): number {
  return Number(process.env.AGENT_MESSAGE_FEE_TOMAN ?? 500);
}

export function isGemma4AgentDefault(): boolean {
  if (isLocalLlmOnly()) return true;
  const provider = process.env.AGENT_LLM_PROVIDER?.trim().toLowerCase();
  if (provider === 'openai') return false;
  if (provider === 'gemma4' || provider === 'local' || provider === 'local-llm' || provider === 'lmstudio') {
    return true;
  }
  if (provider === 'ollama') return false;
  return process.env.AGENT_LLM_PROVIDER == null || process.env.AGENT_LLM_PROVIDER === '';
}

export function getAgentLlmBaseUrl(): string {
  if (process.env.AGENT_LLM_BASE_URL?.trim()) {
    return process.env.AGENT_LLM_BASE_URL.replace(/\/$/, '');
  }
  if (isGemma4AgentDefault()) {
    return getLocalLlmBaseUrl();
  }
  if (isLocalLlmOnly()) {
    return DEFAULT_LOCAL_LLM_URL;
  }
  return 'https://api.openai.com/v1';
}

export function getAgentLlmModel(): string {
  if (process.env.AGENT_LLM_MODEL?.trim()) return process.env.AGENT_LLM_MODEL.trim();
  if (isGemma4AgentDefault()) {
    return getLocalLlmModelId();
  }
  if (isLocalLlmOnly()) {
    return DEFAULT_LOCAL_LLM_MODEL;
  }
  return 'gpt-4o-mini';
}

