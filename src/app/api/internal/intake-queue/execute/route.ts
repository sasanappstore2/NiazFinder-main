import { NextRequest, NextResponse } from 'next/server';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { runIntakeListingCopyJob } from '@/lib/need-intake/intake-queue-sync-fallback';
import type { IntakeListingCopyJobPayload } from '@/lib/need-intake/intake-queue-types';
import { verifyInternalApiSecret } from '@/lib/security/internal-secret';

export const runtime = 'nodejs';

/** Internal executor for NestJS intake queue workers. */
export async function POST(request: NextRequest) {
  const auth = verifyInternalApiSecret(request);
  if (auth === 'unconfigured') {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  if (auth === 'mismatch') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const jobName = typeof body.jobName === 'string' ? body.jobName : '';
  const payload = body.payload as Record<string, unknown> | undefined;

  if (jobName === 'intake.analyze') {
    const text = (payload?.text as string | undefined)?.trim() ?? '';
    if (text.length < 3) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    const result = await runIntakeIntelligence({
      text,
      citySlug: payload?.citySlug as string | undefined,
      cityName: payload?.cityName as string | undefined,
      formHints: payload?.formHints as
        | {
            categorySlug?: string;
            subcategorySlug?: string;
            city?: string;
            neighborhood?: string;
            categoryLockedByUser?: boolean;
          }
        | undefined,
    });

    return NextResponse.json({ ok: true, result });
  }

  if (jobName === 'intake.listing-copy') {
    const result = await runIntakeListingCopyJob(payload as unknown as IntakeListingCopyJobPayload);
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
}
