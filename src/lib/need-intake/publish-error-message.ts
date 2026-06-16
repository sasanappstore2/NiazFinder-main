import { CategoryResolveError } from '@/lib/need-intake/resolve-category';

export class PublishInfraError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(code: string, message: string, statusCode = 503) {
    super(message);
    this.name = 'PublishInfraError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const DB_UNAVAILABLE_FA =
  '\u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A. Docker \u0631\u0627 \u0627\u062C\u0631\u0627 \u06A9\u0646\u06CC\u062F: docker compose up -d postgres \u0633\u067E\u0633 npm run categories:sync';

function isDbUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === 'P1001' || e.code === 'P1017') return true;
  const msg = String(e.message ?? '');
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('Connection refused') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('connect ECONNREFUSED')
  );
}

/** Map publish failures to actionable Persian messages for the UI. */
export function formatNeedIntakePublishError(error: unknown): {
  message: string;
  status: number;
  code?: string;
} {
  if (error instanceof PublishInfraError) {
    return { message: error.message, status: error.statusCode, code: error.code };
  }

  if (error instanceof CategoryResolveError) {
    return { message: error.message, status: 422, code: 'category_not_found' };
  }

  if (isDbUnavailableError(error)) {
    return { message: DB_UNAVAILABLE_FA, status: 503, code: 'database_unavailable' };
  }

  if (error instanceof Error) {
    if (error.message.includes('No active category')) {
      return {
        message:
          '\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F. npm run categories:sync \u0631\u0627 \u0627\u062C\u0631\u0627 \u06A9\u0646\u06CC\u062F.',
        status: 422,
        code: 'category_not_synced',
      };
    }
    if (process.env.NODE_ENV !== 'production') {
      return { message: error.message, status: 500, code: 'internal' };
    }
  }

  return {
    message: '\u062E\u0637\u0627\u06CC \u0633\u0631\u0648\u0631. \u0644\u0637\u0641\u0627\u064B \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F.',
    status: 500,
    code: 'internal',
  };
}

export async function assertPublishDatabaseReady(
  ping: () => Promise<unknown>
): Promise<void> {
  try {
    await ping();
  } catch (error) {
    if (isDbUnavailableError(error)) {
      throw new PublishInfraError('database_unavailable', DB_UNAVAILABLE_FA, 503);
    }
    throw error;
  }
}
