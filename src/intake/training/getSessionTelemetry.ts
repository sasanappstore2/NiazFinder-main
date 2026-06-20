import type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';
import { getRecentPostIntakeEvents } from '@/intake/telemetry/postIntakeTelemetryStore';
import { loadPostIntakeEventsForAnalysis } from '@/intake/telemetry/postIntakeTelemetryReplayReader';

/** Collect post-intake events for a wizard session (memory + optional JSONL replay). */
export async function getTelemetryForSession(sessionId: string): Promise<PostIntakeEvent[]> {
  if (!sessionId.trim()) return [];

  const memory = getRecentPostIntakeEvents({ limit: 500 }).filter(
    (e) => e.sessionId === sessionId
  );

  let fileEvents: PostIntakeEvent[] = [];
  try {
    const all = await loadPostIntakeEventsForAnalysis({ sinceDays: 1, maxEvents: 5000 });
    fileEvents = all.filter((e) => e.sessionId === sessionId);
  } catch {
    /* optional dir */
  }

  const seen = new Set<string>();
  const merged: PostIntakeEvent[] = [];
  for (const e of [...memory, ...fileEvents]) {
    const key = `${e.timestamp}|${e.type}|${'fieldKey' in e ? e.fieldKey : ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(e);
  }
  merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return merged;
}
