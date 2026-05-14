import type { Prisma } from '@prisma/client';

// ============ Cursor Encoding / Decoding ============

/**
 * Creates a base64-encoded cursor from a date and id.
 * Format: base64("{ISODateString}|{id}")
 */
export function encodeCursor(date: Date, id: string): string {
  const payload = `${date.toISOString()}|${id}`;
  return Buffer.from(payload).toString('base64url');
}

/**
 * Decodes a base64 cursor into its date and id components.
 */
export function decodeCursor(cursor: string): { date: Date; id: string } {
  try {
    const payload = Buffer.from(cursor, 'base64url').toString('utf-8');
    const separatorIndex = payload.indexOf('|');
    if (separatorIndex === -1) {
      throw new Error('فرمت کرسر نامعتبر است');
    }
    const isoDate = payload.slice(0, separatorIndex);
    const id = payload.slice(separatorIndex + 1);
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      throw new Error('تاریخ در کرسر نامعتبر است');
    }
    return { date, id };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`خطا در رمزگشایی کرسر: ${error.message}`);
    }
    throw new Error('خطا در رمزگشایی کرسر');
  }
}

/**
 * Builds a Prisma `where` clause for cursor-based pagination.
 * Uses `OR` with either equal createdAt + greater id, or greater createdAt.
 *
 * @param cursor - Optional encoded cursor string
 * @param fieldName - The date field to paginate on (default: 'createdAt')
 * @returns A Prisma where filter object, or undefined if no cursor
 */
export function buildWhereClause(
  cursor?: string,
  fieldName: string = 'createdAt'
): Prisma.MaybeUndefined<Prisma.StringNullableFilter> | undefined {
  if (!cursor) return undefined;

  let decoded: { date: Date; id: string };
  try {
    decoded = decodeCursor(cursor);
  } catch {
    return undefined;
  }

  return {
    OR: [
      {
        [fieldName]: { equals: decoded.date.toISOString() },
        id: { gt: decoded.id },
      },
      {
        [fieldName]: { lt: decoded.date.toISOString() },
      },
    ],
  } as unknown as Prisma.MaybeUndefined<Prisma.StringNullableFilter>;
}

/**
 * Formats the standard pagination metadata for cursor-based responses.
 */
export function formatPaginationMeta<T>(
  data: T[],
  hasNextPage: boolean,
  nextCursor: string | null
): {
  data: T[];
  pagination: {
    hasNextPage: boolean;
    nextCursor: string | null;
    count: number;
  };
} {
  return {
    data,
    pagination: {
      hasNextPage,
      nextCursor,
      count: data.length,
    },
  };
}
