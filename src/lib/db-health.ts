import { Prisma } from '@prisma/client';

/** Persian message when Postgres is not reachable (local dev). */
export const DATABASE_UNAVAILABLE_FA =
  'اتصال پایگاه‌داده برقرار نیست. Docker Desktop را روشن کنید: docker compose up postgres -d';

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

export function apiErrorFromUnknown(error: unknown): { error: string; status: number } {
  if (isPrismaUnavailableError(error)) {
    return { error: DATABASE_UNAVAILABLE_FA, status: 503 };
  }
  return { error: 'خطای سرور رخ داده است', status: 500 };
}
