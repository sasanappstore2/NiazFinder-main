'use client';

import type { IntakeStep } from '@/contracts/need-intake';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { getSessionId } from '@/lib/analytics/collector';
import {
  getIntakeTelemetrySampleRate,
  type IntakeWizardTelemetryStep,
} from '@/lib/need-intake/intake-telemetry-config';

const PII_BLOCKLIST = new Set([
  'needText',
  'detailsText',
  'title',
  'description',
  'sourceText',
  'rawText',
  'phone',
  'email',
  'text',
  'message',
]);

const WIZARD_STEPS = new Set<IntakeWizardTelemetryStep>([
  'compose',
  'location',
  'preview',
]);

function isWizardStep(step: IntakeStep): step is IntakeWizardTelemetryStep {
  if (step === 'need' || step === 'details') return true;
  return WIZARD_STEPS.has(step as IntakeWizardTelemetryStep);
}

/** Phase 36.8 ? strip free-text / PII from telemetry payloads. */
export function sanitizeIntakeTelemetryProps(
  props?: Record<string, unknown>
): Record<string, unknown> {
  if (!props) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_BLOCKLIST.has(key)) continue;
    if (typeof value === 'string' && value.length > 120) {
      out[`${key}Length`] = value.length;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Phase 36.9 ? production sampling (stable per session). */
export function shouldSampleIntakeTelemetry(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const rate = getIntakeTelemetrySampleRate();
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  const sid = getSessionId();
  let hash = 0;
  for (let i = 0; i < sid.length; i += 1) {
    hash = (hash + sid.charCodeAt(i) * (i + 1)) % 1000;
  }
  return hash / 1000 < rate;
}

function trackIntakeEvent(name: string, props?: Record<string, unknown>): void {
  if (!shouldSampleIntakeTelemetry()) return;
  trackAnalyticsEvent(name, sanitizeIntakeTelemetryProps(props));
}

/** Phase 36.1 — wizard step enter (3 steps). */
export function trackIntakeStepEnter(step: IntakeStep): void {
  const telemetryStep: IntakeWizardTelemetryStep =
    step === 'need' || step === 'details' || step === 'compose'
      ? 'compose'
      : step === 'location' || step === 'preview'
        ? step
        : 'compose';
  if (!WIZARD_STEPS.has(telemetryStep)) return;
  trackIntakeEvent('intake_step_enter', { step: telemetryStep });
  trackIntakeEvent(`intake_wizard_step_${telemetryStep}`, { step: telemetryStep });
}

/** Phase 36.2 ? wizard step exit + duration. */
export function trackIntakeStepExit(
  step: IntakeWizardTelemetryStep,
  durationMs: number,
  extra?: Record<string, unknown>
): void {
  trackIntakeEvent('intake_step_exit', {
    step,
    durationMs,
    durationSec: Math.round(durationMs / 1000),
    ...extra,
  });
}

/** Phase 36.3 ? publish success (no title/body PII). */
export function trackIntakePublishSuccess(props: {
  requestId: string;
  autoApproved?: boolean;
}): void {
  trackIntakeEvent('intake_publish_success', {
    requestId: props.requestId,
    autoApproved: props.autoApproved ?? false,
  });
}

/** Phase 36.3 ? publish failure. */
export function trackIntakePublishFail(props: {
  reason: string;
  field?: string;
  source?: string;
}): void {
  trackIntakeEvent('intake_publish_fail', {
    reason: props.reason,
    field: props.field,
    source: props.source,
  });
}

/** Phase 36.4 ? analyze API latency. */
export function trackIntakeAnalyzeLatency(props: {
  latencyMs: number;
  engine?: string;
  provider?: string;
  circuitOpen?: boolean;
  trigger?: 'go_to_location' | 'location_debounce';
}): void {
  trackIntakeEvent('intake_analyze_latency', props);
}

/** Queue job completion (wizard async pipeline). */
export function trackIntakeQueueJobMetric(props: {
  jobName: string;
  latencyMs: number;
  syncFallback: boolean;
  ok: boolean;
}): void {
  trackIntakeEvent('intake_queue_job', props);
}
