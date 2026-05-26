/** Convert DB budget (bigint) to JSON-safe number for API responses. */
export function budgetToJson(value: bigint | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'bigint' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function budgetToDb(value: number | undefined | null): bigint | null {
  if (value == null || Number.isNaN(value)) return null;
  return BigInt(Math.trunc(value));
}
