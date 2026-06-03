import { NextRequest, NextResponse } from 'next/server';
import { parseFromTextAsync } from '@/lib/need-intake/internal-orchestrator.server';
import {
  checkNeedIntakeRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/need-intake/rate-limit';
import { isNeedIntakeLlmEnabled } from '@/lib/need-intake/qwen-intake-client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rateKey = rateLimitKeyFromRequest(request);
  const limited = checkNeedIntakeRateLimit(`${rateKey}:parse-intent`);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'تعداد درخواست زیاد است. لطفاً کمی صبر کنید.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const text = String(body.text ?? '').trim();
    if (text.length < 2) {
      return NextResponse.json({ error: 'متن خیلی کوتاه است' }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: 'متن خیلی طولانی است' }, { status: 400 });
    }

    const parsedIntent = await parseFromTextAsync(text);

    return NextResponse.json({
      parsedIntent,
      meta: {
        engine: isNeedIntakeLlmEnabled() ? 'intake-qwen+rules' : 'intake-rules',
      },
    });
  } catch (error) {
    console.error('parse-intent error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
