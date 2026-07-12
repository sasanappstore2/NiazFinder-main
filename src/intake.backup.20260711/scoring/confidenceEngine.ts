import type { IntakeConfidence } from '@/intake/types';

export function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

export function mergeConfidence(
  base: IntakeConfidence,
  patch: IntakeConfidence
): IntakeConfidence {
  return { ...base, ...patch };
}

export function overallConfidence(confidence: IntakeConfidence): number {
  const values = Object.values(confidence).filter((v): v is number => typeof v === 'number');
  if (!values.length) return 0;
  return clampConfidence(values.reduce((a, b) => a + b, 0) / values.length);
}
