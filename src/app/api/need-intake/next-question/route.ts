import { NextRequest, NextResponse } from 'next/server';
import { getNextQuestion } from '@/lib/need-intake/question-engine';
import type { IntentType, ParsedIntent } from '@/contracts/need-intake';
import { isIntentType } from '@/config/need-intents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const intentType = String(body.intentType ?? '') as IntentType;
    const parsed = body.parsedIntent as ParsedIntent;
    const answers = (body.answers ?? {}) as Record<string, unknown>;

    if (!isIntentType(intentType) || !parsed) {
      return NextResponse.json({ error: 'داده نامعتبر' }, { status: 400 });
    }

    const result = getNextQuestion(intentType, parsed, answers);
    return NextResponse.json(result);
  } catch (error) {
    console.error('next-question error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
