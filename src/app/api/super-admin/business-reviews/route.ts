import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import { logAdminAction } from '@/lib/audit/admin-audit';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'content:reviews:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId')?.trim() || '';
    const published = searchParams.get('published')?.trim() || '';

    const where: Prisma.BusinessProfileReviewWhereInput = {};
    if (profileId) where.profileId = profileId;
    if (published === 'true') where.isPublished = true;
    if (published === 'false') where.isPublished = false;
    if (q) {
      where.OR = [
        { userName: { contains: q } },
        { comment: { contains: q } },
        { profile: { name: { contains: q } } },
      ];
    }

    const [total, reviews] = await Promise.all([
      db.businessProfileReview.count({ where }),
      db.businessProfileReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          profileId: true,
          userName: true,
          rating: true,
          comment: true,
          reply: true,
          isPublished: true,
          createdAt: true,
          profile: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin business-reviews GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'content:reviews:moderate');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'شناسه نظر الزامی است' }, { status: 400 });
    }
    if (typeof body.isPublished !== 'boolean') {
      return NextResponse.json({ error: 'وضعیت انتشار نامعتبر است' }, { status: 400 });
    }

    const existing = await db.businessProfileReview.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'نظر یافت نشد' }, { status: 404 });
    }

    const review = await db.businessProfileReview.update({
      where: { id },
      data: { isPublished: body.isPublished },
    });

    await logAdminAction(request, authz.user.id, 'content.business_review.update', 'BusinessProfileReview', id, {
      isPublished: body.isPublished,
    });

    return NextResponse.json({
      review: {
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Super admin business-reviews PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
