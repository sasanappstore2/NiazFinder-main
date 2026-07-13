/**
 * Simple in-memory extraction cache (Claude plan Phase 7 simplified).
 */

import type { SmartExtractionResult } from '@/intake/smart-extractor/types';

interface CacheEntry {
  data: SmartExtractionResult;
  timestamp: number;
}

const DEFAULT_TTL_MS = 60_000;

export class ExtractionCache {
  private store = new Map<string, CacheEntry>();
  constructor(private ttlMs = DEFAULT_TTL_MS) {}

  generateKey(text: string, options: unknown): string {
    return `${text}::${JSON.stringify(options ?? {})}`;
  }

  get(key: string): SmartExtractionResult | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() - hit.timestamp > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return hit.data;
  }

  set(key: string, data: SmartExtractionResult): void {
    this.store.set(key, { data, timestamp: Date.now() });
    if (this.store.size > 200) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
  }
}
