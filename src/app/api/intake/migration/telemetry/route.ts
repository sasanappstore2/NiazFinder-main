import { NextRequest, NextResponse } from 'next/server';
import { recordIntakeMigrationEvent } from '@/intake/migration/events';
import { guardIntakePublicApi } from '@/lib/need-intake/intake-api-guard';

const ALLOWED_TYPES = new Set(['LegacyWriteDetected']);

export async function POST(request: NextRequest) {
  const rateLimited = guardIntakePublicApi(request, 'telemetry', 30);
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const type = typeof body.type === 'string' ? body.type : '';
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'نوع رویداد مجاز نیست' }, { status: 400 });
    }

    const payload =
      body.payload && typeof body.payload === 'object' ? (body.payload as Record<string, unknown>) : {};

    await recordIntakeMigrationEvent('LegacyWriteDetected', payload);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
