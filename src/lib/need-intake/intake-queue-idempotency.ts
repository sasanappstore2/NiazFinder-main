import { createHash } from 'node:crypto';

const memory = new Map<string, string>();

export function buildIntakeQueueIdempotencyKey(
  jobName: string,
  payload: unknown,
  clientKey?: string,
): string {
  const raw = JSON.stringify({ jobName, payload, clientKey: clientKey?.trim() || '' });
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export function rememberIdempotentJob(key: string, jobId: string): void {
  memory.set(key, jobId);
}

export function lookupIdempotentJob(key: string): string | null {
  return memory.get(key) ?? null;
}

export function clearIntakeQueueIdempotencyMemory(): void {
  memory.clear();
}
