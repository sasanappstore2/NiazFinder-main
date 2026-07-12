import { createHash } from 'crypto';

/** Stable SHA-256 hex hash for RAG content-idempotency. */
export function hashRagContent(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function truncateForAgent(text: string, maxChars = 400): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

/** Strip common prompt-injection phrases from untrusted listing/business text. */
export function sanitizeUntrustedPassage(text: string, maxChars = 1200): string {
  return truncateForAgent(
    text
      .replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions?/gi, '[filtered]')
      .replace(/system\s*prompt/gi, '[filtered]')
      .replace(/<\s*\/?\s*think\s*>/gi, '')
      .replace(/\{\s*"action"\s*:\s*"tool"/gi, '[filtered]'),
    maxChars,
  );
}
