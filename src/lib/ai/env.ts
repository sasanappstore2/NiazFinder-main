/**
 * Environment config for need-intake AI (LM Studio / OpenAI-compatible).
 */

export type NeedIntakeAiProvider = 'lmstudio' | 'rules';

function envBool(key: string, defaultValue = false): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultValue;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

export function getNeedIntakeAiProvider(): NeedIntakeAiProvider {
  const p = (process.env.NEED_INTAKE_AI_PROVIDER ?? 'lmstudio').toLowerCase();
  if (p === 'rules') return 'rules';
  return 'lmstudio';
}

export function isNeedIntakeAiEnabled(): boolean {
  if (!envBool('NEED_INTAKE_AI_ENABLED', false)) return false;
  return getNeedIntakeAiProvider() !== 'rules';
}

export function getLmStudioBaseUrl(): string {
  const url = process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234/v1';
  return url.replace(/\/$/, '');
}

export function getLmStudioApiKey(): string {
  return process.env.LM_STUDIO_API_KEY ?? 'lm-studio';
}

export function getLmStudioModel(): string | undefined {
  const m = process.env.LM_STUDIO_MODEL?.trim();
  return m || undefined;
}

export function getNeedIntakeAiTimeoutMs(): number {
  const n = Number(process.env.NEED_INTAKE_AI_TIMEOUT_MS ?? '45000');
  return Number.isFinite(n) && n > 0 ? n : 45000;
}

/** Shorter timeout for publish-time enrichment. */
export function getNeedIntakeEnrichTimeoutMs(): number {
  const n = Number(process.env.NEED_INTAKE_ENRICH_TIMEOUT_MS ?? '20000');
  return Number.isFinite(n) && n > 0 ? n : 20000;
}

export function getAiHealthSecret(): string | undefined {
  const s = process.env.NEED_INTAKE_AI_HEALTH_SECRET?.trim();
  return s || undefined;
}
