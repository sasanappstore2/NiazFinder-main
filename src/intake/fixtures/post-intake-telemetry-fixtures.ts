import type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';

const TEMPLATE_ID = 'residential-rent';
const CATEGORY = 'apartment-rent';

function ts(offsetMs: number): string {
  return new Date(Date.UTC(2026, 5, 1, 12, 0, 0) + offsetMs).toISOString();
}

function base(sessionId: string, offsetMs: number): Pick<PostIntakeEvent, 'sessionId' | 'templateId' | 'categorySlug' | 'timestamp'> {
  return {
    sessionId,
    templateId: TEMPLATE_ID,
    categorySlug: CATEGORY,
    timestamp: ts(offsetMs),
  };
}

/** Deterministic multi-session telemetry for schema intelligence tests. */
export function buildResidentialRentTelemetryFixture(): PostIntakeEvent[] {
  const events: PostIntakeEvent[] = [];

  // 12 sessions through need -> details -> location; 5 drop at location; 4 reach preview; 3 publish fail; 2 success
  for (let i = 0; i < 12; i += 1) {
    const sid = `sess-${i}`;
    const t = i * 10_000;
    events.push({
      type: 'step_change',
      ...base(sid, t),
      fromStep: null,
      toStep: 'need',
      direction: 'forward',
    });
    events.push({
      type: 'step_change',
      ...base(sid, t + 1000),
      fromStep: 'need',
      toStep: 'details',
      direction: 'forward',
      durationOnPreviousStepMs: 8000 + i * 100,
    });
    events.push({
      type: 'step_change',
      ...base(sid, t + 2000),
      fromStep: 'details',
      toStep: 'location',
      direction: 'forward',
      durationOnPreviousStepMs: 12000,
    });

    events.push({
      type: 'field_change',
      ...base(sid, t + 2100),
      step: 'location',
      fieldKey: 'dealType',
      fieldType: 'select',
      changedFrom: null,
      changedTo: 'rent',
      timeSpentOnFieldMs: 3000,
    });

    // Observed but not in all schema snapshots ? parking candidate
    if (i % 2 === 0) {
      events.push({
        type: 'field_change',
        ...base(sid, t + 2200),
        step: 'location',
        fieldKey: 'parking',
        fieldType: 'toggle',
        changedFrom: null,
        changedTo: true,
        timeSpentOnFieldMs: 1500,
      });
    }

    if (i < 5) {
      events.push({
        type: 'dropoff',
        ...base(sid, t + 3000),
        lastStep: 'location',
        reason: 'page_unmount',
        durationOnLastStepMs: 20000,
      });
      events.push({
        type: 'validation_error',
        ...base(sid, t + 2900),
        step: 'location',
        field: 'city',
        message: 'شهر الزامی است',
        source: 'preview_gate',
      });
      continue;
    }

    events.push({
      type: 'step_change',
      ...base(sid, t + 3000),
      fromStep: 'location',
      toStep: 'preview',
      direction: 'forward',
      durationOnPreviousStepMs: 25000,
    });

    if (i < 10) {
      events.push({
        type: 'publish_attempt',
        ...base(sid, t + 4000),
        outcome: 'fail',
        missingRequiredFields: ['city'],
        errorField: 'city',
      });
      events.push({
        type: 'validation_error',
        ...base(sid, t + 3900),
        step: 'preview',
        field: 'city',
        message: 'شهر الزامی است',
        source: 'publish_validator',
      });
    } else {
      events.push({
        type: 'publish_attempt',
        ...base(sid, t + 4000),
        outcome: 'success',
        autoApproved: true,
        requestId: `req-${i}`,
      });
    }
  }

  return events;
}

export const RESIDENTIAL_RENT_TEMPLATE_ID = TEMPLATE_ID;
export const RESIDENTIAL_RENT_CATEGORY_SLUG = CATEGORY;
