import { createHash } from 'crypto';
import type { IntentGistPromptHints } from '@/intake/intelligence-engine/hybrid/intent-gist-prompt';

const CACHE_VERSION = 'v3';

interface GistCacheEntry {
  gist: string;
  provider: string;
  expiresAt: number;
}

const memoryStore = new Map<string, GistCacheEntry>();

function defaultTtlMs(): number {
  const n = Number(process.env.NEED_INTAKE_INTENT_GIST_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000);
  return Number.isFinite(n) && n > 0 ? n : 24 * 60 * 60 * 1000;
}

export function buildIntentGistCacheKey(text: string, hints?: IntentGistPromptHints): string {
  const payload = [
    CACHE_VERSION,
    text.trim().toLowerCase(),
    hints?.cityName?.trim() ?? '',
    hints?.citySlug?.trim() ?? '',
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

export function getCachedIntentGist(key: string): { gist: string; provider: string } | null {
  const hit = memoryStore.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return { gist: hit.gist, provider: hit.provider };
}

export function setCachedIntentGist(key: string, gist: string, provider: string): void {
  memoryStore.set(key, {
    gist,
    provider,
    expiresAt: Date.now() + defaultTtlMs(),
  });
  if (memoryStore.size > 3000) {
    const first = memoryStore.keys().next().value;
    if (first) memoryStore.delete(first);
  }
}
