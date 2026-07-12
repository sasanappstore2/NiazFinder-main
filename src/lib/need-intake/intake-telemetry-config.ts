/** Phase 36 ? intake telemetry sampling and env. */

export const INTAKE_WIZARD_STEPS = ['compose', 'location', 'preview'] as const;

export type IntakeWizardTelemetryStep = (typeof INTAKE_WIZARD_STEPS)[number];

const DEFAULT_SAMPLE_RATE = 0.1;

export function getIntakeTelemetrySampleRate(): number {
  const raw = Number.parseFloat(
    process.env.NEXT_PUBLIC_INTAKE_TELEMETRY_SAMPLE_RATE ?? ''
  );
  if (!Number.isFinite(raw)) return DEFAULT_SAMPLE_RATE;
  return Math.min(1, Math.max(0, raw));
}

/** Target max drop-off between consecutive wizard steps (phase 36.7). */
export const INTAKE_FUNNEL_DROPOFF_TARGET_PCT = 15;

export const INTAKE_TELEMETRY_ENV_KEYS = [
  'NEXT_PUBLIC_INTAKE_TELEMETRY_SAMPLE_RATE',
] as const;
