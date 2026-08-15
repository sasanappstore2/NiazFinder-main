/**
 * Phase 46.4 ? HTTP client to Nest intake-queue worker service.
 */
import { getNestApiBase } from '@/lib/need-intake/intake-queue-policy';
import type {
  IntakeQueueEnqueueRequest,
  IntakeQueueJobRecord,
} from '@/lib/need-intake/intake-queue-types';

export interface NestEnqueueResponse {
  ok: boolean;
  jobId?: string;
  idempotencyKey?: string;
  error?: string;
}

let nestDownUntilMs = 0;
const NEST_ENQUEUE_TIMEOUT_MS = 250;
const NEST_DOWN_CACHE_MS = 15_000;

function nestCircuitOpen(): boolean {
  return Date.now() < nestDownUntilMs;
}

function markNestDown(): void {
  nestDownUntilMs = Date.now() + NEST_DOWN_CACHE_MS;
}

export async function nestEnqueueIntakeJob(
  request: IntakeQueueEnqueueRequest
): Promise<NestEnqueueResponse> {
  if (nestCircuitOpen()) {
    return { ok: false, error: 'nest circuit open' };
  }
  const base = getNestApiBase();
  try {
    const res = await fetch(`${base}/api/intake-queue/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(NEST_ENQUEUE_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
    }

    return (await res.json()) as NestEnqueueResponse;
  } catch (err) {
    markNestDown();
    const msg = err instanceof Error ? err.message : 'nest unreachable';
    return { ok: false, error: msg };
  }
}

export async function nestFetchIntakeJob(jobId: string): Promise<IntakeQueueJobRecord | null> {
  const base = getNestApiBase();
  try {
    const res = await fetch(`${base}/api/intake-queue/jobs/${jobId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as IntakeQueueJobRecord;
  } catch {
    return null;
  }
}

export async function isIntakeQueueReachable(): Promise<boolean> {
  const base = getNestApiBase();
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
