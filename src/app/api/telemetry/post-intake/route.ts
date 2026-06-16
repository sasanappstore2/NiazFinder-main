import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { appendPostIntakeEvents } from '@/intake/telemetry/postIntakeTelemetryStore';
import { appendPostIntakeEventsToFile } from '@/intake/telemetry/postIntakeTelemetryFileWriter';

export const runtime = 'nodejs';

const MAX_BATCH = 50;
const MAX_BODY_BYTES = 64_000;

const eventBaseSchema = z.object({
  sessionId: z.string().min(1).max(128),
  templateId: z.string().min(1).max(128),
  categorySlug: z.string().max(128).nullable().optional(),
  timestamp: z.string().min(10).max(64),
});

const postIntakeEventSchema = z.discriminatedUnion('type', [
  eventBaseSchema.extend({
    type: z.literal('step_change'),
    fromStep: z
      .enum(['need', 'details', 'location', 'preview', 'publishing', 'done'])
      .nullable(),
    toStep: z.enum(['need', 'details', 'location', 'preview', 'publishing', 'done']),
    direction: z.enum(['forward', 'back', 'jump']),
    durationOnPreviousStepMs: z.number().nonnegative().optional(),
  }),
  eventBaseSchema.extend({
    type: z.literal('field_change'),
    step: z.enum(['need', 'details', 'location', 'preview', 'publishing', 'done']),
    fieldKey: z.string().min(1).max(128),
    fieldType: z.string().min(1).max(64),
    changedFrom: z.unknown(),
    changedTo: z.unknown(),
    timeSpentOnFieldMs: z.number().nonnegative(),
  }),
  eventBaseSchema.extend({
    type: z.literal('validation_error'),
    step: z.enum(['need', 'details', 'location', 'preview', 'publishing', 'done']),
    field: z.string().min(1).max(128),
    message: z.string().min(1).max(500),
    source: z.enum(['publish_validator', 'preview_gate', 'wizard_gate']),
  }),
  eventBaseSchema.extend({
    type: z.literal('publish_attempt'),
    outcome: z.enum(['success', 'fail']),
    missingRequiredFields: z.array(z.string()).optional(),
    errorField: z.string().optional(),
    errorMessage: z.string().optional(),
    autoApproved: z.boolean().optional(),
    requestId: z.string().optional(),
  }),
  eventBaseSchema.extend({
    type: z.literal('dropoff'),
    lastStep: z.enum(['need', 'details', 'location', 'preview', 'publishing', 'done']),
    reason: z.enum(['page_unmount', 'navigation', 'session_reset']),
    durationOnLastStepMs: z.number().nonnegative(),
    completionScore: z.number().optional(),
  }),
]);

const batchSchema = z.object({
  events: z.array(postIntakeEventSchema).min(1).max(MAX_BATCH),
});

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
    }

    const body = await request.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'invalid_shape', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    appendPostIntakeEvents(parsed.data.events);
    appendPostIntakeEventsToFile(parsed.data.events);

    if (process.env.NODE_ENV !== 'production') {
      console.info(
        '[post-intake-telemetry]',
        parsed.data.events.length,
        'event(s)',
        parsed.data.events.map((e) => e.type)
      );
    }

    return NextResponse.json({ ok: true, accepted: parsed.data.events.length });
  } catch (error) {
    console.warn('[post-intake-telemetry] ingest failed:', error);
    return NextResponse.json({ ok: true, accepted: 0, degraded: true });
  }
}
