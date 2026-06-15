/** Client-safe policy for live listing copy stream (no server-only imports). */

export function isIntakeLiveCopyStreamEnabled(): boolean {
  const live = process.env.NEXT_PUBLIC_NEED_INTAKE_LIVE_COPY_ENABLED?.trim().toLowerCase();
  if (live === 'false' || live === '0') return false;
  const copy = process.env.NEXT_PUBLIC_NEED_INTAKE_COPY_AI_ENABLED?.trim().toLowerCase();
  if (copy === 'false' || copy === '0') return false;
  return true;
}

export function intakeLiveCopyDebounceMs(step?: string): number {
  const raw = process.env.NEXT_PUBLIC_NEED_INTAKE_LIVE_COPY_DEBOUNCE_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 300) return n;
  return step === 'location' ? 2000 : 1200;
}
