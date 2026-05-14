import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/posts/[id]/like - toggle like
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const post = await db.userPost.findFirst({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: 'پست یافت نشد' }, { status: 404 });
    }

    const existing = await db.postLike.findUnique({
      where: { postId_userId: { postId, userId: authUser.id } },
    });

    if (existing) {
      await db.postLike.delete({ where: { id: existing.id } });
      await db.userPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
      return NextResponse.json({ liked: false });
    } else {
      await db.postLike.create({ data: { postId, userId: authUser.id } });
      await db.userPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error('Post like error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
