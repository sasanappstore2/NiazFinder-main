/**
 * Tiny structured logger for the intake server layer.
 *
 * Emits one JSON line per event so logs are greppable/queryable instead of the
 * ad-hoc `console.error('[publish] ...', err)` strings scattered through the
 * route handlers. Keep it dependency-free — it must be importable from services
 * that run inside the request handler, the queue worker, and self-tests.
 */
export type IntakeLogLevel = 'debug' | 'info' | 'warn' | 'error';

function emit(level: IntakeLogLevel, event: string, fields: Record<string, unknown>): void {
  const line: Record<string, unknown> = { lvl: level, scope: 'intake', event, ...sanitize(fields) };
  const text = safeStringify(line);
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

/** Errors don't serialize via JSON.stringify — unwrap them to a plain shape. */
function sanitize(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v;
  }
  return out;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function intakeLog(event: string, fields: Record<string, unknown> = {}): void {
  emit('info', event, fields);
}
intakeLog.warn = (event: string, fields: Record<string, unknown> = {}) => emit('warn', event, fields);
intakeLog.error = (event: string, fields: Record<string, unknown> = {}) => emit('error', event, fields);

/**
 * Run a fire-and-forget side effect (telemetry, migration events) without ever
 * crashing the request, but — unlike a bare `void fn().catch(() => {})` — log
 * the rejection so silent failures become visible.
 */
export function safeFireAndForget(label: string, fn: () => void | Promise<unknown>): void {
  try {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).then === 'function') {
      (r as Promise<unknown>).catch((err) => intakeLog.error(`fire_and_forget.${label}`, { err }));
    }
  } catch (err) {
    intakeLog.error(`fire_and_forget.${label}`, { err });
  }
}
