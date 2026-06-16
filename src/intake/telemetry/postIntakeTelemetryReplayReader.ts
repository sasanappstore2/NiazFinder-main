import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';
import { getRecentPostIntakeEvents } from '@/intake/telemetry/postIntakeTelemetryStore';

const DEFAULT_SINCE_DAYS = 7;
const DEFAULT_MAX_EVENTS = 50_000;

export interface LoadPostIntakeEventsOptions {
  templateId?: string;
  categorySlug?: string;
  sinceDays?: number;
  maxEvents?: number;
  /** Override telemetry directory (tests). */
  telemetryDir?: string;
}

function dateStringsForRange(sinceDays: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < sinceDays; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}.jsonl`);
  }
  return out;
}

function parseJsonlLine(line: string): PostIntakeEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as PostIntakeEvent;
  } catch {
    return null;
  }
}

async function readJsonlFile(filePath: string): Promise<PostIntakeEvent[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const events: PostIntakeEvent[] = [];
    for (const line of raw.split('\n')) {
      const parsed = parseJsonlLine(line);
      if (parsed) events.push(parsed);
    }
    return events;
  } catch {
    return [];
  }
}

function filterEvents(
  events: PostIntakeEvent[],
  opts: LoadPostIntakeEventsOptions
): PostIntakeEvent[] {
  let list = events;
  if (opts.templateId) {
    list = list.filter((e) => e.templateId === opts.templateId);
  }
  if (opts.categorySlug) {
    list = list.filter((e) => e.categorySlug === opts.categorySlug);
  }
  return list;
}

function dedupeAndSort(events: PostIntakeEvent[]): PostIntakeEvent[] {
  const seen = new Set<string>();
  const unique: PostIntakeEvent[] = [];
  for (const e of events) {
    const key = `${e.sessionId}|${e.timestamp}|${e.type}|${'fieldKey' in e ? e.fieldKey : ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(e);
  }
  unique.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return unique;
}

export async function loadPostIntakeEventsForAnalysis(
  opts: LoadPostIntakeEventsOptions = {}
): Promise<PostIntakeEvent[]> {
  const sinceDays = opts.sinceDays ?? DEFAULT_SINCE_DAYS;
  const maxEvents = opts.maxEvents ?? DEFAULT_MAX_EVENTS;
  const telemetryDir =
    opts.telemetryDir?.trim() ||
    process.env.POST_INTAKE_TELEMETRY_DIR?.trim() ||
    join(process.cwd(), 'data', 'telemetry', 'post-intake');

  const memory = getRecentPostIntakeEvents({
    templateId: opts.templateId,
    categorySlug: opts.categorySlug,
    limit: RECENT_CAP_SAFE,
  });

  const fileEvents: PostIntakeEvent[] = [];
  const fileNames = dateStringsForRange(sinceDays);

  for (const name of fileNames) {
    const path = join(telemetryDir, name);
    fileEvents.push(...(await readJsonlFile(path)));
  }

  // Also pick up any extra files in dir (best-effort)
  try {
    const entries = await readdir(telemetryDir);
    for (const entry of entries) {
      if (!entry.endsWith('.jsonl') || fileNames.includes(entry)) continue;
      fileEvents.push(...(await readJsonlFile(join(telemetryDir, entry))));
    }
  } catch {
    /* dir may not exist */
  }

  const merged = dedupeAndSort(
    filterEvents([...memory, ...fileEvents], opts)
  );

  if (merged.length > maxEvents) {
    return merged.slice(-maxEvents);
  }
  return merged;
}

const RECENT_CAP_SAFE = 500;

/** Parse events from a single JSONL string (tests). */
export function parsePostIntakeJsonl(content: string): PostIntakeEvent[] {
  const events: PostIntakeEvent[] = [];
  for (const line of content.split('\n')) {
    const parsed = parseJsonlLine(line);
    if (parsed) events.push(parsed);
  }
  return events;
}
