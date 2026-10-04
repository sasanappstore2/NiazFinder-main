import 'server-only';

import type { NeedDraft } from '@/contracts/need-intake';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { generateListingCopy } from '@/lib/need-intake/generate-listing-copy';
import type {
  IntakeAnalyzeJobPayload,
  IntakeListingCopyJobPayload,
  IntakeQueueEnqueueRequest,
  IntakeQueueEnqueueResponse,
  IntakeQueueJobName,
} from '@/lib/need-intake/intake-queue-types';
import {
  buildIntakeQueueIdempotencyKey,
  lookupIdempotentJob,
  rememberIdempotentJob,
} from '@/lib/need-intake/intake-queue-idempotency';
import {
  getIntakeQueueJob,
  newSyncJobId,
  saveIntakeQueueJob,
} from '@/lib/need-intake/intake-queue-store';

async function executeJob(jobName: IntakeQueueJobName, payload: unknown): Promise<unknown> {
  if (jobName === 'intake.analyze') {
    const p = payload as IntakeAnalyzeJobPayload;
    return runIntakeIntelligence({
      text: p.text,
      draftRevision: p.draftRevision,
      citySlug: p.citySlug,
      cityName: p.cityName,
      forceAi: p.forceAi,
      formHints: p.formHints,
    });
  }
  if (jobName === 'intake.listing-copy') {
    const p = payload as IntakeListingCopyJobPayload;
    return runIntakeListingCopyJob(p);
  }
  throw new Error(`Unsupported sync job: ${jobName}`);
}

export async function runIntakeListingCopyJob(
  payload: IntakeListingCopyJobPayload,
  _opts?: { stream?: boolean },
): Promise<{ title: string; description: string }> {
  const draft = payload.draft as unknown as NeedDraft;
  const copy = await generateListingCopy(draft);
  return { title: copy.title, description: copy.description };
}

export async function enqueueIntakeQueueSyncFallback(
  request: IntakeQueueEnqueueRequest,
): Promise<IntakeQueueEnqueueResponse> {
  const idempotencyKey =
    request.idempotencyKey?.trim() ||
    buildIntakeQueueIdempotencyKey(request.jobName, request.payload);

  const existingId = lookupIdempotentJob(idempotencyKey);
  if (existingId) {
    const existing = getIntakeQueueJob(existingId);
    if (existing) {
      return {
        jobId: existing.jobId,
        status: existing.status,
        idempotencyKey,
        pollUrl: `/api/need-intake/queue/jobs/${existing.jobId}`,
        streamUrl: `/api/need-intake/queue/jobs/${existing.jobId}/stream`,
        syncFallback: true,
        result: existing.result,
      };
    }
  }

  const jobId = newSyncJobId();
  const now = Date.now();

  try {
    const result = await executeJob(request.jobName, request.payload);
    saveIntakeQueueJob({
      jobId,
      jobName: request.jobName,
      status: 'completed',
      idempotencyKey,
      priority: 5,
      createdAt: now,
      updatedAt: Date.now(),
      result,
      syncFallback: true,
    });
    rememberIdempotentJob(idempotencyKey, jobId);

    return {
      jobId,
      status: 'completed',
      idempotencyKey,
      pollUrl: `/api/need-intake/queue/jobs/${jobId}`,
      streamUrl: `/api/need-intake/queue/jobs/${jobId}/stream`,
      syncFallback: true,
      result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'job failed';
    saveIntakeQueueJob({
      jobId,
      jobName: request.jobName,
      status: 'failed',
      idempotencyKey,
      priority: 5,
      createdAt: now,
      updatedAt: Date.now(),
      error: message,
      syncFallback: true,
    });
    rememberIdempotentJob(idempotencyKey, jobId);
    throw err;
  }
}
