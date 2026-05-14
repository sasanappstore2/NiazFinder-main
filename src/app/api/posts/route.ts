import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/posts - create a post
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, imageUrls, isPrivate } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'محتوای پست الزامی است' }, { status: 400 });
    }
    if (content.trim().length > 2000) {
      return NextResponse.json({ error: 'متن پست حداکثر ۲۰۰۰ کاراکتر' }, { status: 400 });
    }

    const post = await db.userPost.create({
      data: {
        userId: authUser.id,
        content: content.trim(),
        imageUrls: imageUrls || '[]',
        isPrivate: isPrivate || false,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, username: true },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Post create error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// GET /api/posts - get feed (cursor-based pagination)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || '';
    const cursor = url.searchParams.get('cursor') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { isPrivate: false };
    if (userId) {
      where.userId = userId;
    }
    if (cursor) {
      (where as Record<string, { lt: Date }>).createdAt = { lt: new Date(cursor) };
    }

    // Fetch one extra to determine hasMore
    const posts = await db.userPost.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, username: true },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    // Check if current user liked each post
    const postsWithLikeStatus = await Promise.all(
      items.map(async (post) => {
        const like = authUser
          ? await db.postLike.findUnique({
              where: { postId_userId: { postId: post.id, userId: authUser.id } },
            })
          : null;
        return {
          ...post,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          isLiked: !!like,
        };
      })
    );

    return NextResponse.json({
      posts: postsWithLikeStatus,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Posts feed error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
