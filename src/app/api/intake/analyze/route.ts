import { NextRequest, NextResponse } from 'next/server';
import { analyzeNeedText, analyzeNeedTextAsync } from '@/intake/engine/intakeEngine';
import { getIntakeIndexes } from '@/intake/dictionaries/loader';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import {
  intakeAnalyzeRequestSchema,
  type IntakeAnalyzeResponse,
} from '@/intake/api/intake.dto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'بدنه درخواست نامعتبر است' }, { status: 400 });
    }
    const parsed = intakeAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'درخواست نامعتبر' },
        { status: 400 }
      );
    }

    const indexes = await getIntakeIndexes();
    const aiConfig = getAiSemanticConfig();

    if (aiConfig.enabled) {
      const result = await analyzeNeedTextAsync(parsed.data.text, indexes);
      const { meta: aiMeta, ...analysis } = result;
      const response: IntakeAnalyzeResponse = {
        ...analysis,
        meta: {
          engine: aiMeta.engine,
          indexStats: {
            categories: indexes.stats.categories,
            cities: indexes.stats.cities,
            neighborhoods: indexes.stats.neighborhoods,
          },
          ai: aiMeta,
          trace: aiMeta.trace,
        },
      };
      return NextResponse.json(response);
    }

    const result = analyzeNeedText(parsed.data.text, indexes);
    const response: IntakeAnalyzeResponse = {
      ...result,
      meta: {
        engine: 'intake-rules',
        indexStats: {
          categories: indexes.stats.categories,
          cities: indexes.stats.cities,
          neighborhoods: indexes.stats.neighborhoods,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Intake analyze error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
