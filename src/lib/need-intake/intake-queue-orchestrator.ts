import 'server-only';

import {
  isIntakeQueueEnabled,
  isIntakeQueueSyncFallbackEnabled,
  resolveIntakeQueuePriority,
} from '@/lib/need-intake/intake-queue-policy';
import { nestEnqueueIntakeJob, nestFetchIntakeJob } from '@/lib/need-intake/intake-queue-client';
import { enqueueIntakeQueueSyncFallback } from '@/lib/need-intake/intake-queue-sync-fallback';
import { getIntakeQueueJob } from '@/lib/need-intake/intake-queue-store';
import type {
  IntakeQueueEnqueueRequest,
  IntakeQueueEnqueueResponse,
} from '@/lib/need-intake/intake-queue-types';

function jobUrls(jobId: string) {
  return {
    pollUrl: `/api/need-intake/queue/jobs/${jobId}`,
    streamUrl: `/api/need-intake/queue/jobs/${jobId}/stream`,
  };
}

export async function enqueueIntakeJobOrchestrated(
  request: IntakeQueueEnqueueRequest,
): Promise<IntakeQueueEnqueueResponse> {
  if (!isIntakeQueueEnabled()) {
    return enqueueIntakeQueueSyncFallback(request);
  }

  const nest = await nestEnqueueIntakeJob({
    ...request,
    paidTier: request.paidTier,
  });

  if (!nest.ok || !nest.jobId) {
    if (isIntakeQueueSyncFallbackEnabled()) {
      return enqueueIntakeQueueSyncFallback(request);
    }
    throw new Error(nest.error ?? 'intake queue unavailable');
  }

  const urls = jobUrls(nest.jobId);
  return {
    jobId: nest.jobId,
    status: 'queued',
    idempotencyKey: nest.idempotencyKey ?? request.idempotencyKey ?? nest.jobId,
    ...urls,
  };
}

export async function fetchIntakeJobMerged(jobId: string) {
  const local = getIntakeQueueJob(jobId);
  if (local) return local;
  return nestFetchIntakeJob(jobId);
}

export async function waitForIntakeJobResult(jobId: string, timeoutMs = 120_000): Promise<unknown> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await fetchIntakeJobMerged(jobId);
    if (!job) throw new Error('job not found');
    if (job.status === 'completed') return job.result;
    if (job.status === 'failed' || job.status === 'dead_letter') {
      throw new Error(job.error ?? 'job failed');
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('job timeout');
}

export { resolveIntakeQueuePriority };
