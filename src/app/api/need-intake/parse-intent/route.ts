import { NextRequest, NextResponse } from 'next/server';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { parseIntentWithAi } from '@/lib/need-intake/llm-parse-intent';
import { isNeedIntakeAiEnabled } from '@/lib/ai/env';
import { getIntentDefinition } from '@/config/need-intents';
import { guessVerticalFromText } from '@/lib/need-intake/prompts';
import type { FieldOption, ParseIntentResponse } from '@/contracts/need-intake';
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
    const { parsed, source, llmRaw, cacheHit, latencyMs } = isNeedIntakeAiEnabled()
      ? await parseIntentWithAi(text)
      : {
          parsed: parseIntentFromText(text),
          source: 'rules' as const,
          cacheHit: false,
          latencyMs: Date.now() - started,
        };

    const def = getIntentDefinition(parsed.intentType);
    const vertical = guessVerticalFromText(text);

    const suggestedChips: FieldOption[] = [
      { value: 'confirm', label: `بله، ${def.labelFa}` },
      { value: 'change', label: 'نه، اصلاح می‌کنم' },
    ];

    const assistantMessage =
      parsed.confidence >= 0.75
        ? `نیازتان را فهمیدم (${def.labelFa}). چند سؤال کوتاه می‌پرسم؛ بعد می‌توانید بیشتر با من گفتگو کنید.`
        : `فکر می‌کنم منظورتان «${def.labelFa}» است. درست است؟`;

    const response: ParseIntentResponse & {
      meta?: {
        source: string;
        aiEnabled: boolean;
        vertical?: string;
        cacheHit?: boolean;
        latencyMs?: number;
      };
      debug?: { llmRaw?: unknown };
    } = {
      parsed,
      suggestedChips,
      assistantMessage,
      meta: {
        source,
        aiEnabled: isNeedIntakeAiEnabled(),
        vertical,
        cacheHit: cacheHit ?? false,
        latencyMs: latencyMs ?? Date.now() - started,
      },
    };

    if (process.env.NODE_ENV !== 'production' && llmRaw) {
      response.debug = { llmRaw };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('parse-intent error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
