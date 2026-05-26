import { NextRequest, NextResponse } from 'next/server';
import type { NeedDraft } from '@/contracts/need-intake';
import { runChatTurnRules } from '@/lib/need-intake/chat-turn-rules';
import {
  checkNeedIntakeRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/need-intake/rate-limit';

export async function POST(request: NextRequest) {
  const rateKey = rateLimitKeyFromRequest(request);
  const limited = checkNeedIntakeRateLimit(rateKey);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'تعداد درخواست زیاد است. لطفاً کمی صبر کنید.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const draft = body.draft as NeedDraft;
    const message = String(body.message ?? '').trim();

    if (!draft?.parsedIntent) {
      return NextResponse.json({ error: 'پیش‌نویس نامعتبر' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: 'پیام خالی است' }, { status: 400 });
    }

    const result = runChatTurnRules(draft, message);
    const { mergedIntent, ...response } = result;

    return NextResponse.json({
      ...response,
      mergedIntent: mergedIntent ?? null,
    });
  } catch (error) {
    console.error('chat-turn error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
