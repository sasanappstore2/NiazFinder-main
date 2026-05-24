/** Safe JSON parse/stringify for Prisma string columns. */

export function parseJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function parseJsonObject<T extends Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T
): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return typeof v === 'object' && v !== null ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? []);
}
