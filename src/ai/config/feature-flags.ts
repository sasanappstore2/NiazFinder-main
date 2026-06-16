export const AI_SEMANTIC_CONFIG = {
  enabled: process.env.AI_SEMANTIC_RESOLVER_ENABLED === 'true',
  confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD ?? '0.85'),
  ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL ?? 'gemma4:e4b',
  localLlmUrl: process.env.NEED_INTAKE_LLM_URL ?? process.env.LOCAL_LLM_URL ?? 'http://127.0.0.1:1234',
  localLlmModel: process.env.NEED_INTAKE_LLM_MODEL ?? process.env.LOCAL_LLM_MODEL ?? 'gemma',
  provider: (process.env.AI_PROVIDER ?? 'local-llm') as
    | 'ollama'
    | 'local-llm'
    | 'openai'
    | 'gemini'
    | 'mock',
  timeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS ?? '15000', 10),
  maxRetries: parseInt(process.env.AI_MAX_RETRIES ?? '2', 10),
} as const;

export function getAiSemanticConfig() {
  return { ...AI_SEMANTIC_CONFIG };
}
