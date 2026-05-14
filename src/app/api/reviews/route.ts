import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, type PaginatedResponse } from '@/lib/auth';

// ============ TYPES ============

interface ReviewListItem {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  request: {
    id: string;
    title: string;
  };
}

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'شناسه کاربر الزامی است' },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          request: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      db.review.count({ where: { userId } }),
    ]);

    const mappedReviews: ReviewListItem[] = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      response: r.response,
      createdAt: r.createdAt.toISOString(),
      author: r.author,
      request: r.request,
    }));

    const response: PaginatedResponse<ReviewListItem> = {
      data: mappedReviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Reviews GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ POST handler ============

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { targetUserId, proposalId, rating, comment } = body;

    // Validate required fields
    if (!targetUserId || !proposalId || !rating || !comment?.trim()) {
      return NextResponse.json(
        { error: 'شناسه کاربر هدف، شناسه پیشنهاد، امتیاز و نظر الزامی است' },
        { status: 400 }
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'امتیاز باید بین ۱ تا ۵ باشد' },
        { status: 400 }
      );
    }

    // Validate comment length
    if (comment.trim().length < 10) {
      return NextResponse.json(
        { error: 'حداقل ۱۰ کاراکتر برای نظر الزامی است' },
        { status: 400 }
      );
    }

    // Cannot review yourself
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'شما نمی‌توانید به خودتان نظر دهید' },
        { status: 400 }
      );
    }

    // Check proposal exists
    const proposal = await db.proposal.findUnique({
      where: { id: proposalId },
      include: {
        request: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'پیشنهاد مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Validate: proposal must be accepted
    if (proposal.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'فقط می‌توانید برای پیشنهادهای پذیرفته شده نظر دهید' },
        { status: 400 }
      );
    }

    // Validate: user hasn't already reviewed this proposal
    const existingReview = await db.review.findFirst({
      where: {
        requestId: proposal.request.id,
        authorId: user.id,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'شما قبلاً برای این نیاز نظر ثبت کرده‌اید' },
        { status: 409 }
      );
    }

    // Create review
    const review = await db.review.create({
      data: {
        rating,
        comment: comment.trim(),
        authorId: user.id,
        userId: targetUserId,
        requestId: proposal.request.id,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        request: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const result: ReviewListItem = {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      response: review.response,
      createdAt: review.createdAt.toISOString(),
      author: review.author,
      request: review.request,
    };

    return NextResponse.json(
      { message: 'نظر با موفقیت ثبت شد', review: result },
      { status: 201 }
    );
  } catch (error) {
    console.error('Reviews POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
