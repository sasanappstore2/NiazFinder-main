import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/intake/server/validation/parseRequest';
import { extractSlotsRequestSchema } from '@/intake/server/validation/requestSchemas';
import { extractSlotsService } from '@/intake/server/intakeQueryService';
import {
  checkNeedIntakeRateLimit,
  rateLimitKeyFromRequest,
} from '@/lib/need-intake/rate-limit';
import { intakeLog } from '@/intake/server/logger';

export async function POST(request: NextRequest) {
  const rateKey = rateLimitKeyFromRequest(request);
  const limited = checkNeedIntakeRateLimit(`${rateKey}:extract-slots`);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'تعداد درخواست زیاد است. لطفاً کمی صبر کنید.' },
      { status: 429 },
    );
  }

  const parsed = await parseJsonBody(request, extractSlotsRequestSchema, {
    invalidMessage: 'پارامتر نامعتبر',
  });
  if (!parsed.ok) return parsed.response;

  try {
    return NextResponse.json(extractSlotsService(parsed.data));
  } catch (error) {
    intakeLog.error('extract_slots.failed', { err: error });
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
