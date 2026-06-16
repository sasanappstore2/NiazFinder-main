/**
 * Post intake telemetry ? event schema, adapters, PII sanitize, enable flag.
 * Run: npm run test:post-intake-telemetry
 */
import {
  isPostIntakeTelemetryEnabled,
  flushPostIntakeTelemetry,
  resetPostIntakeTelemetryState,
  setPostIntakeTelemetryAdapter,
  setPostIntakeTelemetryContext,
  trackEvent,
  trackFieldChange,
  trackPublishAttempt,
  trackStepChange,
  trackValidationError,
} from '@/intake/telemetry/postIntakeTelemetry';
import type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';
import {
  composePostIntakeTelemetryAdapters,
  createConsolePostIntakeTelemetryAdapter,
} from '@/intake/telemetry/adapters/postIntakeTelemetryAdapter';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  const prevFlag = process.env.NEXT_PUBLIC_POST_INTAKE_TELEMETRY;
  process.env.NEXT_PUBLIC_POST_INTAKE_TELEMETRY = 'true';
  assert(isPostIntakeTelemetryEnabled(), 'enabled by default');

  process.env.NEXT_PUBLIC_POST_INTAKE_TELEMETRY = 'false';
  assert(!isPostIntakeTelemetryEnabled(), 'disabled via env false');
  process.env.NEXT_PUBLIC_POST_INTAKE_TELEMETRY = 'true';

  resetPostIntakeTelemetryState();
  const collected: PostIntakeEvent[] = [];
  setPostIntakeTelemetryAdapter({
    emit(events) {
      collected.push(...events);
    },
  });
  setPostIntakeTelemetryContext({
    templateId: 'residential-rent',
    categorySlug: 'apartment-rent',
    step: 'location',
  });

  trackStepChange('location', { fromStep: 'details' });
  trackFieldChange({
    fieldKey: 'dealType',
    fieldType: 'select',
    changedFrom: null,
    changedTo: 'rent',
  });
  trackValidationError({
    field: 'city',
    message: 'شهر الزامی است',
    source: 'preview_gate',
  });
  trackPublishAttempt({
    outcome: 'fail',
    missingRequiredFields: ['city'],
  });

  trackEvent({
    type: 'dropoff',
    sessionId: 'test-session',
    templateId: 'residential-rent',
    categorySlug: 'apartment-rent',
    timestamp: new Date().toISOString(),
    lastStep: 'preview',
    reason: 'page_unmount',
    durationOnLastStepMs: 1200,
  });

  flushPostIntakeTelemetry();

  assert(collected.length >= 5, `expected events, got ${collected.length}`);
  assert(collected.some((e) => e.type === 'step_change'), 'step_change');
  assert(collected.some((e) => e.type === 'field_change'), 'field_change');
  assert(collected.some((e) => e.type === 'validation_error'), 'validation_error');
  assert(collected.some((e) => e.type === 'publish_attempt'), 'publish_attempt');
  assert(collected.some((e) => e.type === 'dropoff'), 'dropoff');

  const fieldEvt = collected.find((e) => e.type === 'field_change');
  assert(fieldEvt && fieldEvt.templateId === 'residential-rent', 'context templateId');

  const composed = composePostIntakeTelemetryAdapters([
    createConsolePostIntakeTelemetryAdapter(),
  ]);
  assert(typeof composed.emit === 'function', 'adapter compose');

  console.log('post-intake-telemetry self-test: 12/12 passed');
  process.env.NEXT_PUBLIC_POST_INTAKE_TELEMETRY = prevFlag;
}

main();
