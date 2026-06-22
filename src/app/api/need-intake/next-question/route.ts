import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/intake/server/validation/parseRequest';
import { nextQuestionRequestSchema } from '@/intake/server/validation/requestSchemas';
import { getNextQuestionService } from '@/intake/server/intakeQueryService';
import { intakeLog } from '@/intake/server/logger';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, nextQuestionRequestSchema, {
    invalidMessage: 'داده نامعتبر',
  });
  if (!parsed.ok) return parsed.response;

  try {
    return NextResponse.json(getNextQuestionService(parsed.data));
  } catch (error) {
    intakeLog.error('next_question.failed', { err: error });
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
