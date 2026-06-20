import { createHash, randomUUID } from 'node:crypto';
import type { IntakeQueueJobRecord } from '@/lib/need-intake/intake-queue-types';

const jobs = new Map<string, IntakeQueueJobRecord>();

export function saveIntakeQueueJob(record: IntakeQueueJobRecord): void {
  jobs.set(record.jobId, record);
}

export function getIntakeQueueJob(jobId: string): IntakeQueueJobRecord | null {
  return jobs.get(jobId) ?? null;
}

export function clearIntakeQueueJobStore(): void {
  jobs.clear();
}

export function newSyncJobId(): string {
  return randomUUID();
}

export function hashPayload(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}
