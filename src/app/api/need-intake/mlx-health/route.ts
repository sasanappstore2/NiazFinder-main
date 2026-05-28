import { NextResponse } from 'next/server';
import { checkIntakeMlxHealth } from '@/lib/need-intake/llm-parse-client';
import { isNeedIntakeDevToolsEnabled } from '@/lib/need-intake/dataset/dev-guard';

export async function GET() {
  if (!isNeedIntakeDevToolsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const health = await checkIntakeMlxHealth();
  return NextResponse.json({
    ...health,
    llmEnabled: process.env.NEED_INTAKE_LLM_ENABLED === 'true',
    llmUrl: process.env.NEED_INTAKE_LLM_URL ?? 'http://127.0.0.1:8100',
  });
}
