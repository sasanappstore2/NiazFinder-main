import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { tokenize } from '@/intake/tokenizer/tokenize';
import { generateNgrams } from '@/intake/ngrams/generateNgrams';
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { runSemanticResolver } from '@/ai/services/semanticResolver';
import { retrieveIntakeCandidates } from '@/ai/services/candidateRetrieval';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';

export const runtime = 'nodejs';

const bodySchema = z.object({
  text: z.string().min(1).max(4000),
  provider: z.string().optional(),
  forceAi: z.boolean().optional(),
});

/** Development-only AI intake test endpoint. */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const started = performance.now();
    const indexes = buildIntakeIndexesSync();
    const ruleEngine = analyzeNeedText(parsed.data.text, indexes);
    const normalizedText = normalizePersian(parsed.data.text);
    const tokens = tokenize(normalizedText, { removeStopWords: true });
    const ngrams = generateNgrams(tokens);

    const resolved = await runSemanticResolver(
      ruleEngine,
      parsed.data.text,
      indexes,
      tokens,
      ngrams.all,
      {
        forceAi: parsed.data.forceAi ?? getAiSemanticConfig().enabled,
        providerOverride: parsed.data.provider ?? 'mock',
      }
    );

    const candidates = retrieveIntakeCandidates(
      indexes,
      tokens,
      ngrams.all,
      ruleEngine
    );

    return NextResponse.json({
      ruleEngine: resolved.ruleEngine,
      candidates,
      aiExtraction: resolved.aiExtraction,
      mergedResult: resolved.mergedResult,
      validatedPatch: resolved.validatedPatch,
      provider: resolved.provider ?? parsed.data.provider ?? 'mock',
      aiInvoked: resolved.aiInvoked,
      aiError: resolved.aiError,
      latencyMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    console.error('AI intake test error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
