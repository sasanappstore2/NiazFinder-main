import { mkdir } from 'node:fs/promises';
import { appendFile } from 'node:fs';
import { join } from 'node:path';
import type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';

function defaultTelemetryDir(): string {
  return (
    process.env.POST_INTAKE_TELEMETRY_DIR?.trim() ||
    join(process.cwd(), 'data', 'telemetry', 'post-intake')
  );
}

export function isPostIntakeTelemetryFileEnabled(): boolean {
  const raw = process.env.POST_INTAKE_TELEMETRY_FILE_ENABLED;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

function dateFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}.jsonl`;
}

export function resolvePostIntakeTelemetryFilePath(date = new Date()): string {
  return join(defaultTelemetryDir(), dateFileName(date));
}

/** Non-blocking append-only JSONL writer with daily rotation. */
export function appendPostIntakeEventsToFile(events: readonly PostIntakeEvent[]): void {
  if (!isPostIntakeTelemetryFileEnabled() || events.length === 0) return;

  const dir = defaultTelemetryDir();
  const filePath = resolvePostIntakeTelemetryFilePath();
  const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';

  setImmediate(() => {
    void (async () => {
      try {
        await mkdir(dir, { recursive: true });
        await new Promise<void>((resolve, reject) => {
          appendFile(filePath, lines, 'utf8', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (error) {
        console.warn('[post-intake-telemetry] file append failed:', error);
      }
    })();
  });
}
