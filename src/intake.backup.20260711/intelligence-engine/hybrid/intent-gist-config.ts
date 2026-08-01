import { isHybridIntakeEnabled } from '@/intake/intelligence-engine/hybrid/config';

/** Lightweight ≤10-word AI intent summary before rules matching. */
export function isIntentGistEnabled(): boolean {
  const raw = process.env.NEED_INTAKE_INTENT_GIST_ENABLED;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return isHybridIntakeEnabled();
}
