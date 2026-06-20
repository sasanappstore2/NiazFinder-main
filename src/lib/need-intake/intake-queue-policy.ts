/** Phase 46.7/46.10 — queue priority + Nest base URL policy. */

export function getNestApiBase(): string {
  return (
    process.env.NEST_API_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_NEST_API_URL?.replace(/\/$/, '') ||
    process.env.INTAKE_QUEUE_URL?.replace(/\/$/, '') ||
    'http://127.0.0.1:4000'
  );
}

export function getIntakeQueuePaidPriority(): number {
  const raw = process.env.INTAKE_QUEUE_PAID_PRIORITY;
  const n = raw != null ? Number(raw) : 1;
  return Number.isFinite(n) ? n : 1;
}

export function getIntakeQueueDefaultPriority(): number {
  const raw = process.env.INTAKE_QUEUE_DEFAULT_PRIORITY;
  const n = raw != null ? Number(raw) : 5;
  return Number.isFinite(n) ? n : 5;
}

export function resolveIntakeQueuePriority(paidTier: boolean): number {
  return paidTier ? getIntakeQueuePaidPriority() : getIntakeQueueDefaultPriority();
}

export function getIntakeQueueLoadTargetJobsPerMin(): number {
  const raw = process.env.INTAKE_QUEUE_LOAD_TARGET_JOBS_PER_MIN;
  const n = raw != null ? Number(raw) : 200;
  return Number.isFinite(n) ? n : 200;
}

export function isIntakeQueueEnabled(): boolean {
  const raw = process.env.INTAKE_QUEUE_ENABLED;
  if (raw == null || raw === '') return true;
  return raw !== 'false' && raw !== '0';
}

export function isIntakeQueueSyncFallbackEnabled(): boolean {
  const raw = process.env.INTAKE_QUEUE_SYNC_FALLBACK;
  if (raw == null || raw === '') return true;
  return raw !== 'false' && raw !== '0';
}
