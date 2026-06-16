import type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';

const RECENT_CAP = 500;

const recentEvents: PostIntakeEvent[] = [];

/** Append events to in-memory ring buffer (server-side ingest). */
export function appendPostIntakeEvents(events: readonly PostIntakeEvent[]): void {
  for (const event of events) {
    recentEvents.push(event);
    if (recentEvents.length > RECENT_CAP) recentEvents.shift();
  }
}

export function getRecentPostIntakeEvents(opts?: {
  templateId?: string;
  categorySlug?: string;
  limit?: number;
}): PostIntakeEvent[] {
  let list = recentEvents;
  if (opts?.templateId) {
    list = list.filter((e) => e.templateId === opts.templateId);
  }
  if (opts?.categorySlug) {
    list = list.filter((e) => e.categorySlug === opts.categorySlug);
  }
  const limit = opts?.limit ?? RECENT_CAP;
  return list.slice(-limit);
}

/** Test-only reset. */
export function clearPostIntakeTelemetryStore(): void {
  recentEvents.length = 0;
}

export function getPostIntakeTelemetryStoreSize(): number {
  return recentEvents.length;
}
