import { NextRequest, NextResponse } from 'next/server';
import { getNeedVisibility } from '@/lib/smart-matching/need-visibility';
import { requireAuthUser, proxyToNest } from '@/lib/smart-matching/api-helpers';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuthUser(request);
  if (!user) return response!;

  const { id } = await context.params;
  const proxied = await proxyToNest(request, `/api/smart-matching/needs/${id}/visibility`);
  if (proxied) return proxied;

  const visibility = await getNeedVisibility(id);
  if (!visibility) {
    return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
  }
  return NextResponse.json(visibility);
}
