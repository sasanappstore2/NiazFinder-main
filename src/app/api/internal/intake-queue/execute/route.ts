import { NextRequest, NextResponse } from 'next/server';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';

export const runtime = 'nodejs';

/** Internal executor for NestJS intake queue workers. */
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  const header = request.headers.get('x-internal-secret');
  if (header !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const jobName = typeof body.jobName === 'string' ? body.jobName : '';
  const payload = body.payload as { text?: string; citySlug?: string; cityName?: string } | undefined;

  if (jobName !== 'intake.analyze') {
    return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
  }

  const text = payload?.text?.trim() ?? '';
  if (text.length < 3) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  const result = await runIntakeIntelligence({
    text,
    citySlug: payload?.citySlug,
    cityName: payload?.cityName,
  });

  return NextResponse.json({ ok: true, result });
}
