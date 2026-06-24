import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:categories:read');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const category = await db.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true, status: true } },
        _count: { select: { requests: true, skills: true, children: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'دسته‌بندی یافت نشد' }, { status: 404 });
    }

    const categoryIds = [category.id, ...category.children.map((c) => c.id)];

    const activeRequests = await db.serviceRequest.count({
      where: {
        status: 'OPEN',
        moderationStatus: 'APPROVED',
        OR: [
          { categoryId: { in: categoryIds } },
          { subcategoryId: { in: categoryIds } },
        ],
      },
    });

    const activeChildren = category.children.filter((c) => c.status === 'ACTIVE').length;

    return NextResponse.json({
      categoryId: category.id,
      slug: category.slug,
      activeRequests,
      skills: category._count.skills,
      activeChildren,
      totalChildren: category._count.children,
    });
  } catch (error) {
    console.error('Super admin category impact GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
