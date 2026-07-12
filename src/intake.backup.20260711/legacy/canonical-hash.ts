import { createHash } from 'node:crypto';

/** Stable SHA-256 hash for canonical ServiceRequestV2 snapshots. */
export function computeCanonicalHash(payload: unknown): string {
  const normalized = JSON.stringify(payload, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (value as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return value;
  });
  return createHash('sha256').update(normalized).digest('hex');
}
