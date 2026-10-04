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
  const sanitize = (value: unknown, key?: string): unknown => {
    if (key === 'leadPhone' || key === 'phone' || key === 'email') return undefined;
    if (typeof value === 'string') return stripTrainingPii(value);
    if (Array.isArray(value)) return value.map((item) => sanitize(item));
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        const sanitized = sanitize(childValue, childKey);
        if (sanitized !== undefined) out[childKey] = sanitized;
      }
      return out;
    }
    return value;
  };
  return sanitize(draft) as T;
}
