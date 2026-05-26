import { NextRequest, NextResponse } from 'next/server';
import type { ParsedIntent } from '@/contracts/need-intake';
import { extractSlotsFromRules } from '@/lib/need-intake/extract-slots-rules';
import {
  checkNeedIntakeRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/need-intake/rate-limit';

export async function POST(request: NextRequest) {
  const rateKey = rateLimitKeyFromRequest(request);
  const limited = checkNeedIntakeRateLimit(`${rateKey}:extract-slots`);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'تعداد درخواست زیاد است. لطفاً کمی صبر کنید.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = body.parsedIntent as ParsedIntent | undefined;
    const answers = (body.answers ?? {}) as Record<string, unknown>;
    const lastAnswer = body.lastAnswer as
      | { fieldKey: string; value: string | number }
      | undefined;

    if (!parsed?.intentType || !parsed.categorySlug) {
      return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 });
    }

    const slots = extractSlotsFromRules(parsed, answers, lastAnswer);

    return NextResponse.json({
      slots,
      meta: { engine: 'internal' },
    });
  } catch (error) {
    console.error('extract-slots error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
