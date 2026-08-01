import { randomUUID } from 'crypto';
import type { RagIndexJob } from '@prisma/client';
import { db } from '@/lib/db';
import { embedBusinessProfileById, clearBusinessEmbedding } from '@/lib/rag/business-embed';
import { indexSiteKnowledgeSource } from '@/lib/rag/knowledge-index';
import { embedServiceRequestById, clearNeedEmbedding } from '@/lib/rag/need-embed';

const DEFAULT_BATCH = 8;
const BASE_BACKOFF_MS = 5_000;

export type ProcessRagJobsResult = {
  claimed: number;
  completed: number;
  failed: number;
  dead: number;
};

function backoffMs(attempts: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, Math.max(0, attempts - 1));
}

/**
 * Atomically claim due PENDING/FAILED jobs (status flip + lock).
 */
async function claimJobs(limit: number, workerId: string): Promise<RagIndexJob[]> {
  const now = new Date();
  const candidates = await db.ragIndexJob.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      availableAt: { lte: now },
    },
    orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
    take: limit * 3,
  });

  const claimed: RagIndexJob[] = [];
  for (const job of candidates) {
    if (claimed.length >= limit) break;
    const updated = await db.ragIndexJob.updateMany({
      where: {
        id: job.id,
        status: { in: ['PENDING', 'FAILED'] },
      },
      data: {
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId,
        attempts: { increment: 1 },
      },
    });
    if (updated.count === 0) continue;
    const fresh = await db.ragIndexJob.findUnique({ where: { id: job.id } });
    if (fresh) claimed.push(fresh);
  }
  return claimed;
}

async function runJob(job: RagIndexJob): Promise<void> {
  if (job.operation === 'DELETE') {
    if (job.sourceType === 'BUSINESS') {
      await clearBusinessEmbedding(job.sourceId);
    } else if (job.sourceType === 'NEED') {
      await clearNeedEmbedding(job.sourceId);
    } else if (job.sourceType === 'SITE_KNOWLEDGE') {
      await db.siteKnowledgeChunk.deleteMany({ where: { sourceKey: job.sourceId } });
    }
    return;
  }

  if (job.sourceType === 'BUSINESS') {
    await embedBusinessProfileById(job.sourceId);
    return;
  }
  if (job.sourceType === 'NEED') {
    await embedServiceRequestById(job.sourceId);
    return;
  }
  if (job.sourceType === 'SITE_KNOWLEDGE') {
    await indexSiteKnowledgeSource(job.sourceId);
  }
}

async function markCompleted(jobId: string): Promise<void> {
  await db.ragIndexJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
}

async function markFailure(job: RagIndexJob, error: unknown): Promise<'failed' | 'dead'> {
  const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
  const attempts = job.attempts;
  const dead = attempts >= job.maxAttempts;

  await db.ragIndexJob.update({
    where: { id: job.id },
    data: {
      status: dead ? 'DEAD' : 'FAILED',
      lastError: message,
      lockedAt: null,
      lockedBy: null,
      availableAt: dead ? new Date() : new Date(Date.now() + backoffMs(attempts)),
    },
  });

  return dead ? 'dead' : 'failed';
}

/** Drain a batch of RAG index jobs. Safe to call from cron / internal API. */
export async function processRagIndexJobs(
  opts: { limit?: number; workerId?: string } = {},
): Promise<ProcessRagJobsResult> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? DEFAULT_BATCH));
  const workerId = opts.workerId ?? `rag-${randomUUID().slice(0, 8)}`;
  const claimed = await claimJobs(limit, workerId);

  let completed = 0;
  let failed = 0;
  let dead = 0;

  for (const job of claimed) {
    try {
      await runJob(job);
      await markCompleted(job.id);
      completed += 1;
    } catch (err) {
      const outcome = await markFailure(job, err);
      if (outcome === 'dead') dead += 1;
      else failed += 1;
      console.warn('[rag] job failed', job.id, job.sourceType, job.sourceId, err);
    }
  }

  return { claimed: claimed.length, completed, failed, dead };
}
