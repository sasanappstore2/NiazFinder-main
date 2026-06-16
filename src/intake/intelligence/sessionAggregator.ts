import type { PostIntakeEvent, PostIntakeWizardStep } from '@/intake/telemetry/postIntakeEvents';
import type {
  AggregatedSession,
  FunnelStep,
  SessionAggregationResult,
  SessionFieldTouch,
} from '@/intake/intelligence/types';
import { FUNNEL_STEPS } from '@/intake/intelligence/types';

const FUNNEL_SET = new Set<string>(FUNNEL_STEPS);

function isFunnelStep(step: string): step is FunnelStep {
  return FUNNEL_SET.has(step);
}

function getOrCreateSession(
  map: Map<string, AggregatedSession>,
  event: PostIntakeEvent
): AggregatedSession {
  let session = map.get(event.sessionId);
  if (!session) {
    session = {
      sessionId: event.sessionId,
      templateId: event.templateId,
      categorySlug: event.categorySlug,
      stepsReached: new Set(),
      fieldsTouched: new Map(),
      validationErrors: new Map(),
      stepDurations: new Map(),
      backNavigations: 0,
      stepTransitions: 0,
    };
    map.set(event.sessionId, session);
  }
  return session;
}

function touchField(
  session: AggregatedSession,
  fieldKey: string,
  timeSpentMs: number,
  isCorrection: boolean
): void {
  const row =
    session.fieldsTouched.get(fieldKey) ??
    ({ changes: 0, totalTimeMs: 0, corrections: 0 } satisfies SessionFieldTouch);
  row.changes += 1;
  row.totalTimeMs += timeSpentMs;
  if (isCorrection) row.corrections += 1;
  session.fieldsTouched.set(fieldKey, row);
}

function isCorrectionValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function aggregateSessions(events: PostIntakeEvent[]): SessionAggregationResult {
  const sessionMap = new Map<string, AggregatedSession>();
  const dropoffsByStep = new Map<string, number>();
  const globalFieldChanges = new Map<string, number>();
  const globalValidationErrors = new Map<string, number>();
  const missingRequiredFieldCounts = new Map<string, number>();

  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const event of sorted) {
    const session = getOrCreateSession(sessionMap, event);

    switch (event.type) {
      case 'step_change': {
        session.stepTransitions += 1;
        if (event.direction === 'back') session.backNavigations += 1;
        if (isFunnelStep(event.toStep)) {
          session.stepsReached.add(event.toStep);
        }
        if (event.fromStep && event.durationOnPreviousStepMs != null) {
          const prev = event.fromStep as PostIntakeWizardStep;
          const existing = session.stepDurations.get(prev) ?? 0;
          session.stepDurations.set(prev, existing + event.durationOnPreviousStepMs);
        }
        break;
      }
      case 'field_change': {
        const correction =
          isCorrectionValue(event.changedFrom) && event.changedFrom !== event.changedTo;
        touchField(session, event.fieldKey, event.timeSpentOnFieldMs, correction);
        globalFieldChanges.set(
          event.fieldKey,
          (globalFieldChanges.get(event.fieldKey) ?? 0) + 1
        );
        if (isFunnelStep(event.step)) {
          session.stepsReached.add(event.step);
        }
        break;
      }
      case 'validation_error': {
        session.validationErrors.set(
          event.field,
          (session.validationErrors.get(event.field) ?? 0) + 1
        );
        globalValidationErrors.set(
          event.field,
          (globalValidationErrors.get(event.field) ?? 0) + 1
        );
        break;
      }
      case 'publish_attempt': {
        session.publishOutcome = event.outcome;
        for (const field of event.missingRequiredFields ?? []) {
          missingRequiredFieldCounts.set(
            field,
            (missingRequiredFieldCounts.get(field) ?? 0) + 1
          );
        }
        break;
      }
      case 'dropoff': {
        session.dropoffStep = event.lastStep;
        dropoffsByStep.set(
          event.lastStep,
          (dropoffsByStep.get(event.lastStep) ?? 0) + 1
        );
        break;
      }
      default:
        break;
    }
  }

  return {
    sessions: [...sessionMap.values()],
    totalSessions: sessionMap.size,
    dropoffsByStep,
    globalFieldChanges,
    globalValidationErrors,
    missingRequiredFieldCounts,
  };
}
