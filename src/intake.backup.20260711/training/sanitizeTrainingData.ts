import { createHash } from 'node:crypto';

const PHONE_RE = /(?:\+98|0098|0)?9\d{9}/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;

/** Strip common PII from training source text. */
export function stripTrainingPii(text: string): string {
  return text.replace(PHONE_RE, '[PHONE]').replace(EMAIL_RE, '[EMAIL]').trim();
}

export function hashSourceText(text: string): string {
  return createHash('sha256').update(text.trim()).digest('hex');
}

/** Remove sensitive fields from draft before persistence. */
export function sanitizeDraftForTraining<T extends Record<string, unknown>>(draft: T): T {
  const { leadPhone: _phone, ...rest } = draft as T & { leadPhone?: unknown };
  return rest as T;
}
