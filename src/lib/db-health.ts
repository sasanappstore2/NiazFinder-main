import { Prisma } from '@prisma/client';

/** Persian message when Postgres is not reachable (local dev). */
export const DATABASE_UNAVAILABLE_FA =
  '??????????? ?? ????? ????. Docker Desktop ?? ???? ????? ???: docker compose up postgres -d';

export function isPrismaUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P1001' || error.code === 'P1017' || error.code === 'P1008';
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /can't reach database|ECONNREFUSED|connection refused/i.test(message);
}
