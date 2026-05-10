import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ============ TYPES ============

interface CreateProposalBody {
  requestId: string;
  price: number;
  deliveryTime?: number;
  deliveryUnit?: string;
  message: string;
}

interface ProposalListItem {
  id: string;
  price: number;
  deliveryTime: number | null;
  deliveryUnit: string;
  message: string;
  status: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    bio: string | null;
    city: string | null;
    isVerified: boolean;
  };
  // Computed rating
  rating: number;
  projectCount: number;
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

    const body: CreateProposalBody = await request.json();
    const { requestId, price, deliveryTime, deliveryUnit, message } = body;

    // Validate required fields
    if (!requestId || !price || !message?.trim()) {
      return NextResponse.json(
        { error: 'شناسه نیاز، قیمت و پیام الزامی است' },
        { status: 400 }
      );
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: 'قیمت باید بیشتر از صفر باشد' },
        { status: 400 }
      );
    }

    // Check request exists and is open
    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
    });

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'نیاز مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    if (serviceRequest.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'این نیاز دیگر باز نیست و امکان ارسال پیشنهاد وجود ندارد' },
        { status: 400 }
      );
    }

    // Prevent user from proposing on their own request
    if (serviceRequest.userId === user.id) {
      return NextResponse.json(
        { error: 'شما نمی‌توانید برای نیاز خود پیشنهاد ارسال کنید' },
        { status: 400 }
      );
    }

    // Check if user already proposed
    const existingProposal = await db.proposal.findFirst({
      where: {
        requestId,
        userId: user.id,
        status: { in: ['PENDING'] },
      },
    });

    if (existingProposal) {
      return NextResponse.json(
        { error: 'شما قبلاً برای این نیاز پیشنهاد ارسال کرده‌اید' },
        { status: 409 }
      );
    }

    // Create proposal and update request count in a transaction
    const proposal = await db.$transaction(async (tx) => {
      const newProposal = await tx.proposal.create({
        data: {
          price,
          deliveryTime: deliveryTime ?? null,
          deliveryUnit: deliveryUnit || 'day',
          message: message.trim(),
          userId: user.id,
          requestId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              bio: true,
              city: true,
              isVerified: true,
            },
          },
        },
      });

      // Increment proposal count on the request
      await tx.serviceRequest.update({
        where: { id: requestId },
        data: { proposalCount: { increment: 1 } },
      });

      return newProposal;
    });

    // Create notification for the request owner
    await db.notification.create({
      data: {
        userId: serviceRequest.userId,
        type: 'NEW_PROPOSAL',
        title: 'پیشنهاد جدید',
        message: `${user.firstName} ${user.lastName} برای نیاز "${serviceRequest.title}" پیشنهاد جدید ارسال کرد`,
        data: JSON.stringify({
          requestId: serviceRequest.id,
          proposalId: proposal.id,
          userId: user.id,
        }),
      },
    });

    const mappedProposal: ProposalListItem = {
      id: proposal.id,
      price: proposal.price,
      deliveryTime: proposal.deliveryTime,
      deliveryUnit: proposal.deliveryUnit,
      message: proposal.message,
      status: proposal.status,
      isRead: proposal.isRead,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      user: proposal.user,
      rating: 0,
      projectCount: 0,
    };

    return NextResponse.json(
      { message: 'پیشنهاد با موفقیت ارسال شد', proposal: mappedProposal },
      { status: 201 }
    );
  } catch (error) {
    console.error('Proposals POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'شناسه نیاز الزامی است' },
        { status: 400 }
      );
    }

    const proposals = await db.proposal.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            city: true,
            isVerified: true,
            givenReviews: {
              select: { rating: true },
            },
            sentProposals: {
              where: { status: 'ACCEPTED' },
              select: { id: true },
            },
          },
        },
      },
    });

    const mappedProposals: ProposalListItem[] = proposals.map((p) => {
      const ratings = p.user.givenReviews.map((r) => r.rating);
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
        : 0;

      return {
        id: p.id,
        price: p.price,
        deliveryTime: p.deliveryTime,
        deliveryUnit: p.deliveryUnit,
        message: p.message,
        status: p.status,
        isRead: p.isRead,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        user: {
          id: p.user.id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          avatar: p.user.avatar,
          bio: p.user.bio,
          city: p.user.city,
          isVerified: p.user.isVerified,
        },
        rating: avgRating,
        projectCount: p.user.sentProposals.length,
      };
    });

    return NextResponse.json({ proposals: mappedProposals });
  } catch (error) {
    console.error('Proposals GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
