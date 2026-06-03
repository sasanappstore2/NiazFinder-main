import { NextRequest, NextResponse } from 'next/server';
import type { NeedDraft } from '@/contracts/need-intake';
import { buildListingPreview } from '@/lib/need-intake/preview-listing';
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
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const draft = body.draft as NeedDraft;
    const extras = Array.isArray(body.extras)
      ? (body.extras as string[]).filter((e) => typeof e === 'string' && e.trim())
      : undefined;

    if (!draft?.entities || !draft?.needType) {
      return NextResponse.json({ error: 'پیش‌نویس نامعتبر' }, { status: 400 });
    }

    const preview = await buildListingPreview(draft, extras);

    return NextResponse.json({
      title: preview.title,
      description: preview.description,
      budgetMin: preview.budgetMin,
      budgetMax: preview.budgetMax,
      suggestedExtras: preview.extras,
      titleSource: preview.titleSource,
    });
  } catch (error) {
    console.error('preview-listing error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
