'use client';

import { getSessionId } from '@/lib/analytics/collector';
import type {
  FieldChangeEvent,
  PostIntakeEvent,
  PostIntakeStepDirection,
  PostIntakeWizardStep,
  PublishAttemptEvent,
  StepChangeEvent,
  ValidationErrorEvent,
  DropoffEvent,
} from '@/intake/telemetry/postIntakeEvents';
import {
  composePostIntakeTelemetryAdapters,
  createDefaultPostIntakeTelemetryAdapters,
  type PostIntakeTelemetryAdapter,
} from '@/intake/telemetry/adapters/postIntakeTelemetryAdapter';

const PII_FIELD_KEYS = new Set([
  'needText',
  'detailsText',
  'sourceText',
  'title',
  'description',
  'phone',
  'email',
  'location',
]);

const STEP_ORDER: Record<PostIntakeWizardStep, number> = {
  compose: 0,
  need: 0,
  details: 0,
  location: 1,
  preview: 2,
  publishing: 3,
  done: 4,
};

export type { PostIntakeWizardStep } from '@/intake/telemetry/postIntakeEvents';

export interface PostIntakeTelemetryContext {
  templateId: string;
  categorySlug?: string | null;
  step: PostIntakeWizardStep;
  completionScore?: number;
}

let adapter: PostIntakeTelemetryAdapter = composePostIntakeTelemetryAdapters(
  createDefaultPostIntakeTelemetryAdapters()
);

let context: PostIntakeTelemetryContext = {
  templateId: 'general',
  categorySlug: null,
  step: 'need',
};

const queue: PostIntakeEvent[] = [];
let flushScheduled = false;

let previousStep: PostIntakeWizardStep | null = null;
let stepEnteredAt = Date.now();
const fieldTouchStartedAt = new Map<string, number>();

export function isPostIntakeTelemetryEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_POST_INTAKE_TELEMETRY;
  return raw !== 'false' && raw !== '0';
}

/** Test / custom backend injection. */
export function setPostIntakeTelemetryAdapter(next: PostIntakeTelemetryAdapter): void {
  adapter = next;
}

export function resetPostIntakeTelemetryState(): void {
  queue.length = 0;
  flushScheduled = false;
  previousStep = null;
  stepEnteredAt = Date.now();
  fieldTouchStartedAt.clear();
  context = { templateId: 'general', categorySlug: null, step: 'need' };
}

export function setPostIntakeTelemetryContext(patch: Partial<PostIntakeTelemetryContext>): void {
  context = { ...context, ...patch };
}

export function getPostIntakeTelemetryContext(): Readonly<PostIntakeTelemetryContext> {
  return context;
}

function nowIso(): string {
  return new Date().toISOString();
}

function baseFields(): Pick<PostIntakeEvent, 'sessionId' | 'templateId' | 'categorySlug' | 'timestamp'> {
  return {
    sessionId: getSessionId(),
    templateId: context.templateId || 'general',
    categorySlug: context.categorySlug ?? null,
    timestamp: nowIso(),
  };
}

function sanitizeFieldValue(key: string, value: unknown): unknown {
  if (PII_FIELD_KEYS.has(key)) {
    if (typeof value === 'string') return { kind: 'string', length: value.length };
    if (Array.isArray(value)) return { kind: 'array', length: value.length };
    return { kind: typeof value };
  }
  if (typeof value === 'string' && value.length > 80) {
    return { kind: 'string', length: value.length, preview: value.slice(0, 40) };
  }
  return value;
}

function resolveStepDirection(
  fromStep: PostIntakeWizardStep | null,
  toStep: PostIntakeWizardStep
): PostIntakeStepDirection {
  if (!fromStep) return 'forward';
  const fromIdx = STEP_ORDER[fromStep];
  const toIdx = STEP_ORDER[toStep];
  if (toIdx > fromIdx) return 'forward';
  if (toIdx < fromIdx) return 'back';
  return 'jump';
}

function scheduleFlush(): void {
  if (!isPostIntakeTelemetryEnabled() || flushScheduled) return;
  flushScheduled = true;

  const run = () => {
    flushScheduled = false;
    if (!queue.length) return;
    const batch = queue.splice(0, queue.length);
    void Promise.resolve(adapter.emit(batch)).catch(() => {
      /* silent */
    });
  };

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 2500 });
  } else {
    setTimeout(run, 0);
  }
}

function enqueue(event: PostIntakeEvent): void {
  if (!isPostIntakeTelemetryEnabled()) return;
  queue.push(event);
  scheduleFlush();
}

export function trackEvent(event: PostIntakeEvent): void {
  enqueue(event);
}

export function trackStepChange(
  toStep: PostIntakeWizardStep,
  opts?: { fromStep?: PostIntakeWizardStep | null; direction?: PostIntakeStepDirection }
): void {
  const fromStep = opts?.fromStep ?? previousStep;
  const direction = opts?.direction ?? resolveStepDirection(fromStep, toStep);
  const durationOnPreviousStepMs =
    fromStep != null ? Math.max(0, Date.now() - stepEnteredAt) : undefined;

  const event: StepChangeEvent = {
    type: 'step_change',
    ...baseFields(),
    fromStep,
    toStep,
    direction,
    durationOnPreviousStepMs,
  };

  previousStep = toStep;
  stepEnteredAt = Date.now();
  context = { ...context, step: toStep };
  enqueue(event);
}

export function trackFieldChange(input: {
  fieldKey: string;
  fieldType: string;
  changedFrom: unknown;
  changedTo: unknown;
  step?: PostIntakeWizardStep;
}): void {
  const fieldKey = input.fieldKey;
  const touchStart = fieldTouchStartedAt.get(fieldKey) ?? stepEnteredAt;
  const timeSpentOnFieldMs = Math.max(0, Date.now() - touchStart);
  fieldTouchStartedAt.set(fieldKey, Date.now());

  const event: FieldChangeEvent = {
    type: 'field_change',
    ...baseFields(),
    step: input.step ?? context.step,
    fieldKey,
    fieldType: input.fieldType,
    changedFrom: sanitizeFieldValue(fieldKey, input.changedFrom),
    changedTo: sanitizeFieldValue(fieldKey, input.changedTo),
    timeSpentOnFieldMs,
  };

  enqueue(event);
}

export function trackValidationError(input: {
  field: string;
  message: string;
  source: ValidationErrorEvent['source'];
  step?: PostIntakeWizardStep;
}): void {
  const event: ValidationErrorEvent = {
    type: 'validation_error',
    ...baseFields(),
    step: input.step ?? context.step,
    field: input.field,
    message: input.message,
    source: input.source,
  };
  enqueue(event);
}

export function trackPublishAttempt(input: {
  outcome: PublishAttemptEvent['outcome'];
  missingRequiredFields?: string[];
  errorField?: string;
  errorMessage?: string;
  autoApproved?: boolean;
  requestId?: string;
}): void {
  const event: PublishAttemptEvent = {
    type: 'publish_attempt',
    ...baseFields(),
    outcome: input.outcome,
    missingRequiredFields: input.missingRequiredFields,
    errorField: input.errorField,
    errorMessage: input.errorMessage,
    autoApproved: input.autoApproved,
    requestId: input.requestId,
  };
  enqueue(event);
}

export function trackDropoff(input: {
  reason: DropoffEvent['reason'];
  lastStep?: PostIntakeWizardStep;
  completionScore?: number;
}): void {
  const lastStep = input.lastStep ?? context.step;
  const event: DropoffEvent = {
    type: 'dropoff',
    ...baseFields(),
    lastStep,
    reason: input.reason,
    durationOnLastStepMs: Math.max(0, Date.now() - stepEnteredAt),
    completionScore: input.completionScore ?? context.completionScore,
  };
  enqueue(event);
}

/** Flush pending events immediately (e.g. before page unload). */
export function flushPostIntakeTelemetry(): void {
  if (!isPostIntakeTelemetryEnabled() || !queue.length) return;
  const batch = queue.splice(0, queue.length);
  void Promise.resolve(adapter.emit(batch)).catch(() => {
    /* silent */
  });
}
