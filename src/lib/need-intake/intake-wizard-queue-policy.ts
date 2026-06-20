/** Client-readable flag: wizard uses intake queue for heavy AI jobs. */
export function isIntakeWizardQueueEnabled(): boolean {
  if (typeof process !== 'undefined') {
    const pub = process.env.NEXT_PUBLIC_INTAKE_WIZARD_USE_QUEUE?.trim().toLowerCase();
    if (pub === 'true' || pub === '1') return true;
    if (pub === 'false' || pub === '0') return false;
  }
  return true;
}

export function getIntakeQueueJobTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_NEED_INTAKE_LLM_TIMEOUT_MS ?? process.env.NEED_INTAKE_LLM_TIMEOUT_MS;
  const n = raw ? Number(raw) : 120_000;
  return Number.isFinite(n) ? Math.max(5_000, n) : 120_000;
}
