/** Google Gemini API (Generative Language API). */

import { isLocalLlmOnly } from '@/lib/local-llm/config';

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

export const DEFAULT_GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta';

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function isGeminiConfigured(): boolean {
  if (isLocalLlmOnly()) return false;
  return Boolean(getGeminiApiKey());
}

/** Gist may use Gemini even when LOCAL_LLM_ONLY blocks other Gemini paths. */
export function isGeminiGistAllowed(): boolean {
  if (!getGeminiApiKey()) return false;
  if (process.env.NEED_INTAKE_INTENT_GIST_PROVIDER?.trim().toLowerCase() === 'gemini') {
    return true;
  }
  return isGeminiConfigured();
}

export function getGeminiModelId(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    process.env.GEMINI_MODEL_ID?.trim() ||
    DEFAULT_GEMINI_MODEL
  );
}

export function getGeminiIntentGistModelId(): string {
  return process.env.GEMINI_INTENT_GIST_MODEL?.trim() || getGeminiModelId();
}

export function getGeminiBaseUrl(): string {
  return (process.env.GEMINI_BASE_URL?.trim() || DEFAULT_GEMINI_BASE_URL).replace(/\/$/, '');
}

export function getGeminiTimeoutMs(): number {
  const n = Number(process.env.GEMINI_TIMEOUT_MS ?? 60_000);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

export function isGeminiFallbackEnabled(): boolean {
  if (isLocalLlmOnly()) return false;
  return process.env.GEMINI_FALLBACK_ENABLED === 'true' && isGeminiConfigured();
}
