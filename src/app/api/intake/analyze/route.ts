import { NextRequest, NextResponse } from 'next/server';
import { intakeAnalyzeRequestSchema } from '@/intake/server/validation/requestSchemas';
import { parseJsonBody } from '@/intake/server/validation/parseRequest';
import { analyzeNeed } from '@/intake/server/analyzeService';
import { guardIntakePublicApi } from '@/lib/need-intake/intake-api-guard';
import { intakeLog } from '@/intake/server/logger';

export const runtime = 'nodejs';

/** Rules-first intake analyze — Intelligence Engine v1 (queue-backed when enabled). */
export async function POST(request: NextRequest) {
  const rateLimited = guardIntakePublicApi(request, 'analyze', 120);
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(request, intakeAnalyzeRequestSchema, {
    invalidMessage: 'Invalid request',
  });
  if (!parsed.ok) return parsed.response;

  try {
    return NextResponse.json(await analyzeNeed(parsed.data));
  } catch (err) {
    intakeLog.error('analyze.failed', { err });
    return NextResponse.json({ error: 'Analyze failed' }, { status: 500 });
  }
}
