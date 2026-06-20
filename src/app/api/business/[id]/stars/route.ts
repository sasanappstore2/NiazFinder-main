import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  BUSINESS_STAR_BOOKMARK_TYPE,
  countBusinessStars,
} from '@/lib/business/stars';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessUserId } = await params;
    if (!businessUserId) {
      return NextResponse.json({ error: 'شناسه کسب‌وکار الزامی است' }, { status: 400 });
    }

    const profile = await db.businessProfile.findUnique({
      where: { userId: businessUserId },
      select: { userId: true, saveCount: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const [starCount, authUser] = await Promise.all([
      countBusinessStars(businessUserId),
      getAuthUser(request),
    ]);

    let isStarred = false;
    if (authUser) {
      const row = await db.bookmark.findUnique({
        where: {
          userId_type_targetId: {
            userId: authUser.id,
            type: BUSINESS_STAR_BOOKMARK_TYPE,
            targetId: businessUserId,
          },
        },
      });
      isStarred = Boolean(row);
    }

    return NextResponse.json({
      starCount: Math.max(starCount, profile.saveCount),
      isStarred,
    });
  } catch (error) {
    console.error('Business stars GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
