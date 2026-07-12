export type LegacyWriteField = 'parsedIntent' | 'answers';

export interface LegacyWriteEvent {
  field: LegacyWriteField;
  source: string;
  at: string;
}

const writeLog: LegacyWriteEvent[] = [];
const MAX_LOG = 200;

export function getLegacyWriteCount(): number {
  return writeLog.length;
}

export function getLegacyWriteLog(): readonly LegacyWriteEvent[] {
  return writeLog;
}

export function resetLegacyWriteLog(): void {
  writeLog.length = 0;
}

async function persistLegacyWriteEvent(event: LegacyWriteEvent): Promise<void> {
  if (typeof window !== 'undefined') {
    void fetch('/api/intake/migration/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'LegacyWriteDetected', payload: event }),
    }).catch(() => {});
    return;
  }

  const { recordIntakeMigrationEvent } = await import('@/intake/migration/events');
  await recordIntakeMigrationEvent('LegacyWriteDetected', { ...event });
}

/**
 * Log when code attempts to write parsedIntent/answers directly.
 * Canonical writes must go through NeedDraft.entities + recompute.
 */
export function warnLegacyWriteDetected(field: LegacyWriteField, source: string): void {
  const event: LegacyWriteEvent = {
    field,
    source,
    at: new Date().toISOString(),
  };
  writeLog.push(event);
  if (writeLog.length > MAX_LOG) writeLog.shift();

  void persistLegacyWriteEvent(event);

  const message = `[LEGACY_WRITE_DETECTED] ${field} write from ${source}`;
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message);
  } else {
    console.info(message);
  }
}
