/**
 * Phase 36 — intake telemetry events, PII sanitize, sampling, funnel config.
 * Run: npm run test:intake-telemetry
 */
import {
  INTAKE_FUNNEL_DROPOFF_TARGET_PCT,
  INTAKE_WIZARD_STEPS,
  getIntakeTelemetrySampleRate,
} from '@/lib/need-intake/intake-telemetry-config';
import {
  sanitizeIntakeTelemetryProps,
  shouldSampleIntakeTelemetry,
} from '@/lib/need-intake/intake-telemetry';
import {
  allIntakeTelemetryChecksPass,
  INTAKE_TELEMETRY_V1_TAG,
} from '@/lib/need-intake/intake-telemetry-release';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  assert(allIntakeTelemetryChecksPass(), 'telemetry release registry');
  assert(INTAKE_TELEMETRY_V1_TAG === 'intake-telemetry-v1', 'release tag');
  assert(INTAKE_WIZARD_STEPS.length === 3, '3 wizard steps');
  assert(getIntakeTelemetrySampleRate() === 0.1, 'default sample rate 10%');
  assert(INTAKE_FUNNEL_DROPOFF_TARGET_PCT === 15, 'dropoff target 15%');

  const sanitized = sanitizeIntakeTelemetryProps({
    step: 'need',
    needText: 'متن محرمانه',
    title: 'عنوان',
    durationMs: 1200,
    requestId: 'req-1',
  });
  assert(!('needText' in sanitized), 'PII needText stripped');
  assert(!('title' in sanitized), 'PII title stripped');
  assert(sanitized.step === 'need', 'safe fields kept');
  assert(sanitized.durationMs === 1200, 'numeric fields kept');

  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  assert(shouldSampleIntakeTelemetry(), 'dev always samples');
  process.env.NODE_ENV = prev;

  console.log(
    JSON.stringify({
      ok: true,
      tag: INTAKE_TELEMETRY_V1_TAG,
      steps: INTAKE_WIZARD_STEPS,
      sampleRate: getIntakeTelemetrySampleRate(),
    })
  );
}

main();
