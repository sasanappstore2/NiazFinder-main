import type { IntakeFieldAction } from '@/intake/agent/types';

/** Confidence-driven questioning thresholds (product policy). */
export const INTAKE_CONFIDENCE_AUTO = 0.9;
export const INTAKE_CONFIDENCE_CONFIRM = 0.6;

/**
 * Proposal-first policy: nothing is auto-accepted into the form.
 * High confidence still maps to `confirm` (UI must ask «آیا … درست است؟»).
 * `auto_accept` is retained only as a legacy enum value — never returned here.
 */
export function resolveFieldAction(confidence: number): IntakeFieldAction {
  if (confidence >= INTAKE_CONFIDENCE_CONFIRM) return 'confirm';
  return 'ask';
}

export function overallConfidenceFromScores(scores: number[]): number {
  const vals = scores.filter((n) => Number.isFinite(n) && n > 0);
  if (!vals.length) return 0;
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.min(1, Math.max(0, sum / vals.length));
}
