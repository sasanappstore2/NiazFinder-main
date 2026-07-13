/** Typed crawl engine errors — every module returns these instead of raw throws. */

export type CrawlErrorCode =
  | 'retryable'
  | 'fatal'
  | 'temporary'
  | 'validation'
  | 'network'
  | 'provider'
  | 'parsing'
  | 'extraction'
  | 'database'
  | 'queue'
  | 'config'
  | 'cancelled';

export type CrawlError = {
  code: CrawlErrorCode;
  message: string;
  retryable: boolean;
  provider?: string;
  url?: string;
  jobId?: string;
  cause?: unknown;
  timestamp: string;
};

export function crawlError(
  code: CrawlErrorCode,
  message: string,
  opts?: Partial<Omit<CrawlError, 'code' | 'message' | 'timestamp'>>
): CrawlError {
  const retryable =
    opts?.retryable ??
    (code === 'retryable' || code === 'temporary' || code === 'network' || code === 'provider');
  return {
    code,
    message,
    retryable,
    provider: opts?.provider,
    url: opts?.url,
    jobId: opts?.jobId,
    cause: opts?.cause,
    timestamp: new Date().toISOString(),
  };
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: CrawlError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: CrawlError): Result<T> {
  return { ok: false, error };
}
