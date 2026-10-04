/** Single source of truth for the local OpenAI-compatible LLM gateway (LM Studio :1234). */

export const DEFAULT_LOCAL_LLM_URL = 'http://127.0.0.1:1234';
export const DEFAULT_LOCAL_LLM_MODEL =
  '/Users/sasan/Desktop/NiazFinder main/models/GEMMA/gemma-4-E4B_q4_0-it.gguf';
export const DEFAULT_LOCAL_LLM_PARALLEL_SLOTS = 4;

export function isLocalLlmOnly(): boolean {
  return process.env.LOCAL_LLM_ONLY !== 'false';
}

export function getLocalLlmBaseUrl(): string {
  const base = (
    process.env.NEED_INTAKE_LLM_URL ??
    process.env.LOCAL_LLM_URL ??
    process.env.AGENT_LLM_BASE_URL ??
    DEFAULT_LOCAL_LLM_URL
  ).replace(/\/$/, '').replace(/\/v1$/, '');
  return base;
}

export function getLocalLlmModelId(): string {
  return (
    process.env.NEED_INTAKE_LLM_MODEL ??
    process.env.LOCAL_LLM_MODEL ??
    process.env.AGENT_LLM_MODEL ??
    DEFAULT_LOCAL_LLM_MODEL
  ).trim();
}

export function getLocalLlmTimeoutMs(): number {
  return Number(
    process.env.NEED_INTAKE_LLM_TIMEOUT_MS ??
      process.env.AGENT_LLM_TIMEOUT_MS ??
      process.env.AI_REQUEST_TIMEOUT_MS ??
      120_000,
  );
}

export function getLocalLlmParallelSlots(): number {
  const n = Number(process.env.LOCAL_LLM_PARALLEL_SLOTS ?? DEFAULT_LOCAL_LLM_PARALLEL_SLOTS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_LOCAL_LLM_PARALLEL_SLOTS;
}
