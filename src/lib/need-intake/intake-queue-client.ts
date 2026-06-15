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

export async function nestEnqueueIntakeJob(
  request: IntakeQueueEnqueueRequest
): Promise<NestEnqueueResponse> {
  const base = getNestApiBase();
  try {
    const res = await fetch(`${base}/api/intake-queue/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
    }

    return (await res.json()) as NestEnqueueResponse;
  } catch (err) {
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
