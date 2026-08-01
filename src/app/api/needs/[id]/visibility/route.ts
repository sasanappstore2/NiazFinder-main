import { NextRequest, NextResponse } from 'next/server';
import { getNeedVisibility } from '@/lib/smart-matching/need-visibility';
import { requireAuthUser, smartMatchingErrorResponse } from '@/lib/smart-matching/api-helpers';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuthUser(request);
  if (!user) return response!;

  const { id } = await context.params;

  try {
    const need = await db.serviceRequest.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!need) {
      return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
    }
    if (need.userId !== user.id) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const visibility = await getNeedVisibility(id);
    if (!visibility) {
      return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
    }
    return NextResponse.json(visibility);
  } catch (err) {
    return smartMatchingErrorResponse(err);
  }
}
