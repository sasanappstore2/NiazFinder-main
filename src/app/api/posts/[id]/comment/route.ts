import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/posts/[id]/comment - add comment
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
    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'متن نظر الزامی است' }, { status: 400 });
    }

    const post = await db.userPost.findFirst({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: 'پست یافت نشد' }, { status: 404 });
    }

    const comment = await db.postComment.create({
      data: { postId, userId: authUser.id, content: content.trim() },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true } },
      },
    });

    await db.userPost.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Post comment error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
