import { NextRequest, NextResponse } from 'next/server';
import { getActiveBusinessesForNeed } from '@/lib/smart-matching/need-chat-session';
import { requireAuthUser, smartMatchingErrorResponse, proxyToNest } from '@/lib/smart-matching/api-helpers';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuthUser(request);
  if (!user) return response!;

  const { id } = await context.params;
  const proxied = await proxyToNest(request, `/api/smart-matching/needs/${id}/active-businesses`);
  if (proxied) return proxied;

  try {
    const data = await getActiveBusinessesForNeed(id, user.id);
    return NextResponse.json({ data });
  } catch (err) {
    return smartMatchingErrorResponse(err);
  }
}
