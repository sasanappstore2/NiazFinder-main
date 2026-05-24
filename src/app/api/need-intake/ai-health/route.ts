import { NextRequest, NextResponse } from 'next/server';
import { getAiHealthSecret, isNeedIntakeAiEnabled } from '@/lib/ai/env';
import { pingLmStudio } from '@/lib/ai/openai-compatible';

export async function GET(request: NextRequest) {
  const secret = getAiHealthSecret();
  if (secret) {
    const header = request.headers.get('x-ai-health-secret');
    if (header !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  if (!isNeedIntakeAiEnabled()) {
    return NextResponse.json({
      ok: false,
      aiEnabled: false,
      message: 'NEED_INTAKE_AI_ENABLED is false or provider is rules',
    });
  }

  const result = await pingLmStudio();
  return NextResponse.json({
    aiEnabled: true,
    ...result,
  });
}
