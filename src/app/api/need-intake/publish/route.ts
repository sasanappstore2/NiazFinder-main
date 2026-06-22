import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import type { NeedDraft, ListingPreview } from '@/contracts/need-intake';
import { formatNeedIntakePublishError } from '@/lib/need-intake/publish-error-message';
import { parseJsonBody } from '@/intake/server/validation/parseRequest';
import { publishRequestSchema } from '@/intake/server/validation/requestSchemas';
import { publishNeedService } from '@/intake/server/publishNeedService';
import { intakeLog } from '@/intake/server/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 },
      );
    }

    const parsed = await parseJsonBody(request, publishRequestSchema, {
      invalidMessage: 'پیش‌نویس نامعتبر',
    });
    if (!parsed.ok) return parsed.response;

    const body = parsed.data;
    // Idempotency key from the header, falling back to sessionId so repeat
    // submits (double-click, auth-resume retry) never create duplicate needs.
    const idempotencyKey =
      request.headers.get('Idempotency-Key')?.trim() || body.sessionId || undefined;

    const result = await publishNeedService({
      draft: body.draft as unknown as NeedDraft,
      listingPreview: body.listingPreview as ListingPreview | undefined,
      sessionId: body.sessionId,
      linkToBusinessProfile: body.linkToBusinessProfile,
      idempotencyKey,
      userId: user.id,
    });

    return NextResponse.json(result.body, {
      status: result.status,
      ...(result.headers ? { headers: result.headers } : {}),
    });
  } catch (error) {
    intakeLog.error('publish.unhandled', { err: error });
    const formatted = formatNeedIntakePublishError(error);
    if (formatted.status === 422 && formatted.code?.startsWith('category')) {
      return NextResponse.json(
        { success: false, errors: [{ path: 'categorySlug', message: formatted.message }] },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: formatted.message, code: formatted.code },
      { status: formatted.status },
    );
  }
}
