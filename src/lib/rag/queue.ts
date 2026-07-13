import type { RagIndexOperation, RagIndexSourceType } from '@prisma/client';
import { db } from '@/lib/db';

export type EnqueueRagJobInput = {
  sourceType: RagIndexSourceType;
  sourceId: string;
  operation?: RagIndexOperation;
  /** Delay before the job becomes claimable (ms). */
  delayMs?: number;
};

/**
 * Enqueue a durable RAG index job. Coalesces duplicate PENDING jobs for the same source.
 */
export async function enqueueRagIndexJob(input: EnqueueRagJobInput): Promise<string> {
  const operation = input.operation ?? 'UPSERT';
  const availableAt = new Date(Date.now() + Math.max(0, input.delayMs ?? 0));

  const existing = await db.ragIndexJob.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: { in: ['PENDING', 'FAILED'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (existing) {
    await db.ragIndexJob.update({
      where: { id: existing.id },
      data: {
        operation,
        status: 'PENDING',
        availableAt,
        lastError: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
    return existing.id;
  }

  const created = await db.ragIndexJob.create({
    data: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      operation,
      status: 'PENDING',
      availableAt,
    },
    select: { id: true },
  });
  return created.id;
}

export function queueBusinessRagIndex(profileId: string, operation: RagIndexOperation = 'UPSERT'): void {
  void enqueueRagIndexJob({ sourceType: 'BUSINESS', sourceId: profileId, operation }).catch((err) => {
    console.warn('[rag] enqueue business failed', profileId, err);
  });
}

export function queueNeedRagIndex(requestId: string, operation: RagIndexOperation = 'UPSERT'): void {
  void enqueueRagIndexJob({ sourceType: 'NEED', sourceId: requestId, operation }).catch((err) => {
    console.warn('[rag] enqueue need failed', requestId, err);
  });
}

export function queueSiteKnowledgeRagIndex(
  sourceKey: string,
  operation: RagIndexOperation = 'UPSERT',
): void {
  void enqueueRagIndexJob({
    sourceType: 'SITE_KNOWLEDGE',
    sourceId: sourceKey,
    operation,
  }).catch((err) => {
    console.warn('[rag] enqueue site knowledge failed', sourceKey, err);
  });
}

export async function getRagQueueLag(): Promise<{
  pending: number;
  processing: number;
  failed: number;
  dead: number;
  oldestPendingAt: string | null;
}> {
  const [pending, processing, failed, dead, oldest] = await Promise.all([
    db.ragIndexJob.count({ where: { status: 'PENDING' } }),
    db.ragIndexJob.count({ where: { status: 'PROCESSING' } }),
    db.ragIndexJob.count({ where: { status: 'FAILED' } }),
    db.ragIndexJob.count({ where: { status: 'DEAD' } }),
    db.ragIndexJob.findFirst({
      where: { status: 'PENDING' },
      orderBy: { availableAt: 'asc' },
      select: { availableAt: true },
    }),
  ]);

  return {
    pending,
    processing,
    failed,
    dead,
    oldestPendingAt: oldest?.availableAt?.toISOString() ?? null,
  };
}
