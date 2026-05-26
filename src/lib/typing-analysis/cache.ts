import type { TypingAnalysisResult } from '@/contracts/typing-analysis';

interface Entry {
  result: TypingAnalysisResult;
  expiresAt: number;
}

const store = new Map<string, Entry>();
const TTL_MS = 10 * 60 * 1000;
const MAX = 500;

function cacheKey(sessionId: string, textHash: string): string {
  return `${sessionId}:${textHash}`;
}

export function getTypingCache(
  sessionId: string,
  textHash: string
): TypingAnalysisResult | null {
  const key = cacheKey(sessionId, textHash);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return { ...entry.result, source: 'cache' };
}

export function setTypingCache(result: TypingAnalysisResult): void {
  if (store.size >= MAX) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(cacheKey(result.sessionId, result.textHash), {
    result,
    expiresAt: Date.now() + TTL_MS,
  });
}
