/**
 * Pure idempotency control-flow for create operations — no DB/server imports, so
 * it is unit-testable in a plain tsx process.
 *
 * Guarantees that a repeated operation carrying the same key never creates a
 * duplicate row:
 *   1. if a row already exists for the key → return it (`deduped`), skip create;
 *   2. else create; if the create loses a unique-constraint race (P2002) → the
 *      other writer already inserted the row, so re-query and return it.
 * With no key, every call creates.
 */
export interface IdempotencyPorts<Row> {
  /** Look up an already-persisted row for this idempotency key. */
  findExisting: (key: string) => Promise<Row | null>;
  /** Insert a new row; may throw a unique-violation error on a race. */
  create: () => Promise<Row>;
  /** True when the error is a unique-constraint violation (Prisma P2002). */
  isUniqueViolation: (err: unknown) => boolean;
}

export interface DedupeOutcome<Row> {
  deduped: boolean;
  row: Row;
}

export function isPrismaUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'P2002';
}

export async function createOrDedupe<Row>(
  key: string | undefined,
  ports: IdempotencyPorts<Row>,
): Promise<DedupeOutcome<Row>> {
  if (key) {
    const existing = await ports.findExisting(key);
    if (existing) return { deduped: true, row: existing };
  }

  try {
    return { deduped: false, row: await ports.create() };
  } catch (err) {
    if (key && ports.isUniqueViolation(err)) {
      const existing = await ports.findExisting(key);
      if (existing) return { deduped: true, row: existing };
    }
    throw err;
  }
}
