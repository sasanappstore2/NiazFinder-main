import { NextRequest, NextResponse } from 'next/server';
import {
  buildParseAssistantMessage,
  buildParseSuggestedChips,
  shouldSkipClarifying,
} from '@/lib/need-intake/parse-assistant';
import { guessVerticalFromText } from '@/lib/need-intake/parse-vertical';
import {
  parseFromText,
  withProcessingDelay,
} from '@/lib/need-intake/internal-orchestrator';
import type { ParseIntentResponse } from '@/contracts/need-intake';
import {
  checkNeedIntakeRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/need-intake/rate-limit';
import { classifyVertical } from '@/lib/need-intake/vertical-classifier';

export async function POST(request: NextRequest) {
  const rateKey = rateLimitKeyFromRequest(request);
  const limited = checkNeedIntakeRateLimit(rateKey);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'تعداد درخواست زیاد است. لطفاً کمی صبر کنید.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limited.retryAfterMs ?? 60000) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const text = String(body.text ?? '').trim();

    if (!text || text.length < 2) {
      return NextResponse.json({ error: 'متن ورودی خیلی کوتاه است' }, { status: 400 });
    }

    const started = Date.now();
    const parsed = await withProcessingDelay(() => parseFromText(text));
    const latencyMs = Date.now() - started;

    const classification = classifyVertical(text);
    const vertical = guessVerticalFromText(text);
    const skipClarify = shouldSkipClarifying(parsed, classification);

    const assistantMessage = buildParseAssistantMessage(parsed, text);
    const suggestedChips = buildParseSuggestedChips(parsed, {}, text);

    const response: ParseIntentResponse = {
      parsed,
      suggestedChips,
      assistantMessage,
      meta: {
        source: 'rules',
        engine: 'internal',
        vertical,
        verticalScore: classification.score,
        verticalCertainty: classification.certainty,
        skipClarifying: skipClarify,
        latencyMs,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('parse-intent error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
