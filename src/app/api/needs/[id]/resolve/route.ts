import { NextRequest, NextResponse } from 'next/server';
import { resolveNeed } from '@/lib/smart-matching/need-resolution';
import { requireAuthUser, smartMatchingErrorResponse, proxyToNest, getNestBaseUrl } from '@/lib/smart-matching/api-helpers';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuthUser(request);
  if (!user) return response!;

  const { id } = await context.params;

  const bodyText = await request.text();
  if (getNestBaseUrl()) {
    const proxied = await proxyToNest(request, `/api/smart-matching/needs/${id}/resolve`, {
      method: 'POST',
      body: bodyText,
    });
    if (proxied) return proxied;
  }

  try {
    const body = bodyText ? JSON.parse(bodyText) : {};
    const result = await resolveNeed(user.id, {
      requestId: id,
      businessProfileId: body.businessProfileId,
      rating: Number(body.rating),
      comment: body.comment,
    });
    return NextResponse.json(result);
  } catch (err) {
    return smartMatchingErrorResponse(err);
  }
}
