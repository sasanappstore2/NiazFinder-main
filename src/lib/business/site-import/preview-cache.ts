import { randomUUID } from 'crypto';
import type { SiteImportSuggestion } from './types';

const TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  userId: string;
  suggestions: SiteImportSuggestion[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

/** Store preview suggestions server-side; client only sends token + ids on apply. */
export function storeSiteImportPreview(
  userId: string,
  suggestions: SiteImportSuggestion[]
): string {
  pruneExpired();
  const token = randomUUID();
  cache.set(token, {
    userId,
    suggestions,
    expiresAt: Date.now() + TTL_MS,
  });
  return token;
}

export function loadSiteImportPreview(
  token: string,
  userId: string
): SiteImportSuggestion[] | null {
  pruneExpired();
  const entry = cache.get(token);
  if (!entry || entry.userId !== userId || entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry.suggestions;
}
