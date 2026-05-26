import { NextRequest, NextResponse } from 'next/server';
import { runTypingAnalysis } from '@/lib/typing-analysis';
import {
  checkTypingRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/need-intake/rate-limit';
import type { TypingAnalyzeRequest } from '@/contracts/typing-analysis';

const INTERNAL_SECRET = process.env.TYPING_INTERNAL_SECRET ?? '';

export async function POST(request: NextRequest) {
  try {
    const ipKey = rateLimitKeyFromRequest(request);
    const body = (await request.json()) as TypingAnalyzeRequest;
    const sessionId = body.sessionId?.trim() || 'anon';
    const limited = checkTypingRateLimit(`${ipKey}:${sessionId}`);
    if (!limited.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'تعداد درخواست زیاد است',
          retryAfterMs: limited.retryAfterMs,
        },
        { status: 429 }
      );
    }

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json({ ok: false, error: 'متن الزامی است' }, { status: 400 });
    }

    if (body.text.length > 2000) {
      return NextResponse.json({ ok: false, error: 'متن بیش از حد طولانی' }, { status: 400 });
    }

    const result = await runTypingAnalysis({
      sessionId,
      text: body.text,
      seq: body.seq,
      locale: body.locale,
      city: body.city,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('typing-analyze error:', error);
    return NextResponse.json(
      { ok: false, error: 'خطا در تحلیل متن' },
      { status: 500 }
    );
  }
}

/** Allow Nest gateway to call this route internally. */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-typing-internal-secret');
  if (INTERNAL_SECRET && secret !== INTERNAL_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  return NextResponse.json({ ok: true, service: 'typing-analyze' });
}
