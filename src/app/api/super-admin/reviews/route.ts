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
    const published = searchParams.get('published')?.trim() || '';

    const where: Prisma.ReviewWhereInput = {};
    if (published === 'true') where.isPublished = true;
    if (published === 'false') where.isPublished = false;
    if (q) {
      where.OR = [
        { comment: { contains: q } },
        { author: { phone: { contains: q } } },
        { user: { phone: { contains: q } } },
        { request: { title: { contains: q } } },
      ];
    }

    const [total, reviews] = await Promise.all([
      db.review.count({ where }),
      db.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          rating: true,
          comment: true,
          response: true,
          isPublished: true,
          createdAt: true,
          author: {
            select: { id: true, displayName: true, phone: true },
          },
          user: {
            select: { id: true, displayName: true, phone: true },
          },
          request: {
            select: { id: true, title: true },
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
    console.error('Super admin reviews GET error:', error);
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

    const existing = await db.review.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'نظر یافت نشد' }, { status: 404 });
    }

    const review = await db.review.update({
      where: { id },
      data: { isPublished: body.isPublished },
    });

    await logAdminAction(request, authz.user.id, 'content.review.update', 'Review', id, {
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
    console.error('Super admin reviews PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
