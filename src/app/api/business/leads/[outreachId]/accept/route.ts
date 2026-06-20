import { NextRequest, NextResponse } from 'next/server';
import { acceptLead } from '@/lib/smart-matching/need-chat-session';
import { requireAuthUser, smartMatchingErrorResponse, proxyToNest } from '@/lib/smart-matching/api-helpers';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ outreachId: string }> }
) {
  const { user, response } = await requireAuthUser(request);
  if (!user) return response!;

  const { outreachId } = await context.params;
  const proxied = await proxyToNest(
    request,
    `/api/smart-matching/business/leads/${outreachId}/accept`,
    { method: 'POST' }
  );
  if (proxied) return proxied;

  try {
    const idempotencyKey = request.headers.get('Idempotency-Key') ?? undefined;
    const session = await acceptLead({
      outreachId,
      businessUserId: user.id,
      idempotencyKey,
    });
    return NextResponse.json({ session });
  } catch (err) {
    return smartMatchingErrorResponse(err);
  }
}
