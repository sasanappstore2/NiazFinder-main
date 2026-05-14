import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/users/[id]/follow - toggle follow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetId } = await params;
    if (targetId === authUser.id) {
      return NextResponse.json({ error: 'نمی‌توانید خودتان را دنبال کنید' }, { status: 400 });
    }

    const targetUser = await db.user.findFirst({ where: { id: targetId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const existing = await db.follow.findUnique({
      where: {
        followerId_followingId: { followerId: authUser.id, followingId: targetId },
      },
    });

    if (existing) {
      await db.follow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false, message: 'دنبال کردن لغو شد' });
    } else {
      await db.follow.create({
        data: { followerId: authUser.id, followingId: targetId },
      });
      return NextResponse.json({ following: true, message: 'با موفقیت دنبال شد' });
    }
  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// GET /api/users/[id]/follow - check follow status + counts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id: targetId } = await params;

    const [followerCount, followingCount] = await Promise.all([
      db.follow.count({ where: { followingId: targetId } }),
      db.follow.count({ where: { followerId: targetId } }),
    ]);

    let isFollowing = false;
    if (authUser && authUser.id !== targetId) {
      const existing = await db.follow.findUnique({
        where: {
          followerId_followingId: { followerId: authUser.id, followingId: targetId },
        },
      });
      isFollowing = !!existing;
    }

    return NextResponse.json({ followerCount, followingCount, isFollowing });
  } catch (error) {
    console.error('Follow status error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
