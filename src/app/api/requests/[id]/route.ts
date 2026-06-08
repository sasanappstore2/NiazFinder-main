import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { ProposalStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function budgetToJson(value: bigint | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'bigint' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

// ============ GET handler ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;
    const decodedKey = decodeURIComponent(idOrSlug);

    const requestInclude = {
      category: {
        select: { id: true, name: true, slug: true, icon: true },
      },
      subcategory: {
        select: { id: true, name: true, slug: true, icon: true },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          city: true,
          createdAt: true,
        },
      },
      proposals: {
        where: { status: { in: [ProposalStatus.PENDING, ProposalStatus.ACCEPTED] } },
        orderBy: { createdAt: 'desc' as const },
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
                where: { status: ProposalStatus.ACCEPTED },
                select: { id: true },
              },
            },
          },
        },
      },
      reviews: {
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
    } satisfies Prisma.ServiceRequestInclude;

    let serviceRequest = await db.serviceRequest.findUnique({
      where: { id: decodedKey },
      include: requestInclude,
    });
    if (!serviceRequest) {
      serviceRequest = await db.serviceRequest.findUnique({
        where: { slug: decodedKey },
        include: requestInclude,
      });
    }

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'نیاز مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const user = await getAuthUser(request);
    const isOwner = user?.id === serviceRequest.userId;
    const isPublic =
      serviceRequest.moderationStatus === 'APPROVED' &&
      ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(serviceRequest.status);

    if (!isPublic && !isOwner && !['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '')) {
      return NextResponse.json(
        {
          error: 'این آگهی هنوز منتشر نشده یا در دسترس نیست',
          code: 'NOT_PUBLISHED',
          moderationStatus: serviceRequest.moderationStatus,
          status: serviceRequest.status,
        },
        { status: 403 }
      );
    }

    if (isPublic) {
      await db.serviceRequest.update({
        where: { id: serviceRequest.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    const mappedProposals = serviceRequest.proposals.map((p) => {
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
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
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

    const mappedReviews = serviceRequest.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      response: r.response,
      createdAt: r.createdAt.toISOString(),
      author: r.author,
    }));

    const result = {
      id: serviceRequest.id,
      title: serviceRequest.title,
      slug: serviceRequest.slug,
      description: serviceRequest.description,
      budgetMin: budgetToJson(serviceRequest.budgetMin),
      budgetMax: budgetToJson(serviceRequest.budgetMax),
      budgetType: serviceRequest.budgetType,
      deliveryTime: serviceRequest.deliveryTime,
      deliveryUnit: serviceRequest.deliveryUnit,
      city: serviceRequest.city,
      province: serviceRequest.province,
      priority: serviceRequest.priority,
      status: serviceRequest.status,
      moderationStatus: serviceRequest.moderationStatus,
      rejectionReason: serviceRequest.rejectionReason,
      tags: JSON.parse(serviceRequest.tags),
      attachmentUrls: JSON.parse(serviceRequest.attachmentUrls),
      viewCount: serviceRequest.viewCount,
      proposalCount: serviceRequest.proposalCount,
      isFeatured: serviceRequest.isFeatured,
      createdAt: serviceRequest.createdAt.toISOString(),
      updatedAt: serviceRequest.updatedAt.toISOString(),
      categoryId: serviceRequest.categoryId,
      subcategoryId: serviceRequest.subcategoryId,
      category: serviceRequest.category,
      subcategory: serviceRequest.subcategory,
      categoryName: serviceRequest.subcategory?.name ?? serviceRequest.category.name,
      categorySlug: serviceRequest.subcategory?.slug ?? serviceRequest.category.slug,
      user: serviceRequest.user,
      proposals: mappedProposals,
      reviews: mappedReviews,
    };

    return NextResponse.json({ request: result });
  } catch (error) {
    console.error('Request detail GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ PUT handler ============

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existingRequest = await db.serviceRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'نیاز مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Check ownership or admin
    if (existingRequest.userId !== user.id && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'شما اجازه ویرایش این نیاز را ندارید' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      budgetMin,
      budgetMax,
      budgetType,
      deliveryTime,
      deliveryUnit,
      city,
      province,
      priority,
      status,
    } = body;

    // Validate status transitions
    if (status) {
      const validTransitions: Record<string, string[]> = {
        OPEN: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CLOSED', 'CANCELLED'],
        CLOSED: ['OPEN'],
        CANCELLED: [],
        COMPLETED: [],
      };

      const allowed = validTransitions[existingRequest.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { error: `تغییر وضعیت از ${existingRequest.status} به ${status} مجاز نیست` },
          { status: 400 }
        );
      }
    }

    const updatedRequest = await db.serviceRequest.update({
      where: { id },
      data: {
        ...(title?.trim() && { title: title.trim() }),
        ...(description?.trim() && { description: description.trim() }),
        ...(budgetMin !== undefined && { budgetMin: budgetMin ?? null }),
        ...(budgetMax !== undefined && { budgetMax: budgetMax ?? null }),
        ...(budgetType && { budgetType }),
        ...(deliveryTime !== undefined && { deliveryTime: deliveryTime ?? null }),
        ...(deliveryUnit && { deliveryUnit }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(province !== undefined && { province: province?.trim() || null }),
        ...(priority && { priority }),
        ...(status && { status }),
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            city: true,
            createdAt: true,
          },
        },
      },
    });

    const result = {
      id: updatedRequest.id,
      title: updatedRequest.title,
      slug: updatedRequest.slug,
      description: updatedRequest.description,
      budgetMin: budgetToJson(updatedRequest.budgetMin),
      budgetMax: budgetToJson(updatedRequest.budgetMax),
      budgetType: updatedRequest.budgetType,
      deliveryTime: updatedRequest.deliveryTime,
      deliveryUnit: updatedRequest.deliveryUnit,
      city: updatedRequest.city,
      province: updatedRequest.province,
      priority: updatedRequest.priority,
      status: updatedRequest.status,
      tags: JSON.parse(updatedRequest.tags),
      viewCount: updatedRequest.viewCount,
      proposalCount: updatedRequest.proposalCount,
      categoryId: updatedRequest.categoryId,
      categoryName: updatedRequest.category.name,
      categoryIcon: updatedRequest.category.icon,
      user: updatedRequest.user,
      createdAt: updatedRequest.createdAt,
      updatedAt: updatedRequest.updatedAt,
    };

    return NextResponse.json(
      { message: 'نیاز با موفقیت بروزرسانی شد', request: result }
    );
  } catch (error) {
    console.error('Request detail PUT error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ DELETE handler ============

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existingRequest = await db.serviceRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'نیاز مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Check ownership or admin
    if (existingRequest.userId !== user.id && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'شما اجازه حذف این نیاز را ندارید' },
        { status: 403 }
      );
    }

    // Soft delete
    await db.serviceRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ message: 'نیاز با موفقیت حذف شد' });
  } catch (error) {
    console.error('Request detail DELETE error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
