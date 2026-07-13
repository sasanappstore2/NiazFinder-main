export function computeBackoffMs(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * baseMs * 0.25);
  return exp + jitter;
}

export function shouldRetry(attempt: number, maxAttempts: number, retryable: boolean): boolean {
  return retryable && attempt < maxAttempts;
}
