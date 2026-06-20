/** Google Gemini API (Generative Language API). */

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

export const DEFAULT_GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta';

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
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
  return process.env.GEMINI_FALLBACK_ENABLED === 'true' && isGeminiConfigured();
}
