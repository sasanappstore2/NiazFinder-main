import { Prisma } from '@prisma/client';

/** Format a float array for Postgres pgvector cast. */
export function pgvectorLiteral(vec: number[]): string {
  return `[${vec.map((v) => (Number.isFinite(v) ? v : 0)).join(',')}]`;
}

/** Prisma.sql fragment for embedding vector literals in $queryRaw. */
export function pgvectorSql(vec: number[]) {
  return Prisma.raw(`'${pgvectorLiteral(vec)}'::vector`);
}

/** Set HNSW search quality for the current session (call before similarity queries). */
export function hnswEfSearchSql(ef = 40): string {
  return `SET LOCAL hnsw.ef_search = ${Math.max(1, Math.floor(ef))}`;
}
