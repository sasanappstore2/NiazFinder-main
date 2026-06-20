import { NextRequest, NextResponse } from 'next/server';
import { reportNeedCompletion } from '@/lib/smart-matching/need-resolution';
import { requireAuthUser, smartMatchingErrorResponse, proxyToNest } from '@/lib/smart-matching/api-helpers';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuthUser(request);
  if (!user) return response!;

  const { id } = await context.params;
  const proxied = await proxyToNest(
    request,
    `/api/smart-matching/business/needs/${id}/report-completion`,
    { method: 'POST' }
  );
  if (proxied) return proxied;

  try {
    const result = await reportNeedCompletion({ requestId: id, businessUserId: user.id });
    return NextResponse.json(result);
  } catch (err) {
    return smartMatchingErrorResponse(err);
  }
}
