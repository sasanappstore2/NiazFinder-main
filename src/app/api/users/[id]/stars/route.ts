import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BUSINESS_STAR_BOOKMARK_TYPE } from '@/lib/business/stars';
import { routeBuilder } from '@/config/routes';
import type { PublicStarredBusiness } from '@/lib/business/starred-business';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'شناسه کاربر الزامی است' }, { status: 400 });
    }

    const userExists = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const bookmarks = await db.bookmark.findMany({
      where: { userId, type: BUSINESS_STAR_BOOKMARK_TYPE },
      orderBy: { createdAt: 'desc' },
    });

    if (bookmarks.length === 0) {
      return NextResponse.json({ starCount: 0, businesses: [] as PublicStarredBusiness[] });
    }

    const businessUserIds = bookmarks.map((b) => b.targetId);
    const profiles = await db.businessProfile.findMany({
      where: { userId: { in: businessUserIds }, status: 'ACTIVE' },
      select: {
        userId: true,
        name: true,
        slug: true,
        logo: true,
        city: true,
        rating: true,
        reviewCount: true,
        verified: true,
        user: { select: { avatar: true, isVerified: true } },
      },
    });

    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    const businesses: PublicStarredBusiness[] = [];
    for (const bookmark of bookmarks) {
      const profile = profileByUserId.get(bookmark.targetId);
      if (!profile) continue;
      businesses.push({
        userId: profile.userId,
        name: profile.name,
        slug: profile.slug,
        logo: profile.logo ?? profile.user.avatar,
        city: profile.city,
        rating: profile.rating,
        reviewCount: profile.reviewCount,
        verified: profile.verified || profile.user.isVerified,
        starredAt: bookmark.createdAt.toISOString(),
        profileUrl: routeBuilder.businessProfile(profile.slug),
      });
    }

    return NextResponse.json({
      starCount: businesses.length,
      businesses,
    });
  } catch (error) {
    console.error('User stars GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
