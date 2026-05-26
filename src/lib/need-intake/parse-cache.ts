import { createHash } from 'crypto';
import type { ParsedIntent } from '@/contracts/need-intake';

interface CacheEntry {
  parsed: ParsedIntent;
  source: 'llm' | 'rules' | 'hybrid';
  llmRaw?: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 200;

function hashText(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

export function getParseCacheTtlMs(): number {
  const n = Number(process.env.NEED_INTAKE_PARSE_CACHE_TTL_MS ?? String(DEFAULT_TTL_MS));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_MS;
}

export function getCachedParse(text: string): CacheEntry | null {
  const key = hashText(text);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry;
}

export function setCachedParse(
  text: string,
  value: Omit<CacheEntry, 'expiresAt'>
): void {
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(hashText(text), {
    ...value,
    expiresAt: Date.now() + getParseCacheTtlMs(),
  });
}

export function clearParseCache(): void {
  store.clear();
}
