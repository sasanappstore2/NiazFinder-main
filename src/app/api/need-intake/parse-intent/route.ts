import { NextRequest, NextResponse } from 'next/server';
import {
  buildParseAssistantMessage,
  buildParseSuggestedChips,
  shouldSkipClarifying,
} from '@/lib/need-intake/parse-assistant';
import { guessVerticalFromText } from '@/lib/need-intake/parse-vertical';
import { withProcessingDelay } from '@/lib/need-intake/internal-orchestrator';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import type { ParseIntentResponse } from '@/contracts/need-intake';
import {
  checkNeedIntakeRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/need-intake/rate-limit';
import { classifyVertical } from '@/lib/need-intake/vertical-classifier';
import { reconcileParsedIntent } from '@/lib/need-intake/parse-coherence';
import { parseIntentViaLlm } from '@/lib/need-intake/llm-parse-client';

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
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // Empty/invalid JSON body should be treated as a bad request (smoke tests hit this path).
      body = {};
    }
    const text = String((body as { text?: string }).text ?? '').trim();

    if (!text || text.length < 2) {
      return NextResponse.json({ error: 'متن ورودی خیلی کوتاه است' }, { status: 400 });
    }

    const started = Date.now();
    const classification = classifyVertical(text);
    const rulesParsed = await withProcessingDelay(() => parseFromText(text));

    const llmResult = await parseIntentViaLlm(text);
    let parsed = rulesParsed;
    let engine: 'internal' | 'hybrid' | 'llm' = 'internal';
    let source: 'rules' | 'hybrid' | 'llm' = 'rules';

    if (llmResult) {
      parsed = reconcileParsedIntent(
        llmResult.parsed,
        rulesParsed,
        text,
        classification
      );
      engine = 'hybrid';
      source = 'hybrid';
    }

    parsed = enrichParsedIntent({ ...parsed, rawText: text });

    const latencyMs = Date.now() - started;
    const vertical = guessVerticalFromText(text);
    const skipClarify = shouldSkipClarifying(parsed, classification);

    const assistantMessage = buildParseAssistantMessage(parsed, text);
    const suggestedChips = buildParseSuggestedChips(parsed, {}, text);

    const response: ParseIntentResponse = {
      parsed,
      suggestedChips,
      assistantMessage,
      meta: {
        source,
        engine,
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
