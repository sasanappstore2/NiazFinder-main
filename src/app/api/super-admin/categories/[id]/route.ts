import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSlug } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { parseCategoryStatus } from '@/lib/categories/category-status';
import type { CategoryStatus } from '@prisma/client';

interface CategoryPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  parentId?: string | null;
  order?: number;
  status?: CategoryStatus;
}

async function makeUniqueSlug(baseValue: string, excludeId: string) {
  const baseSlug = createSlug(baseValue) || `category-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db.category.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:categories:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const body: CategoryPayload = await request.json();
    const existing = await db.category.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: 'دسته‌بندی یافت نشد' },
        { status: 404 }
      );
    }

    if (body.parentId === id) {
      return NextResponse.json(
        { error: 'دسته‌بندی نمی‌تواند والد خودش باشد' },
        { status: 400 }
      );
    }

    if (body.parentId) {
      const parent = await db.category.findUnique({ where: { id: body.parentId } });
      if (!parent) {
        return NextResponse.json(
          { error: 'دسته‌بندی والد یافت نشد' },
          { status: 404 }
        );
      }
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: 'نام دسته‌بندی نمی‌تواند خالی باشد' },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (body.slug !== undefined) data.slug = await makeUniqueSlug(body.slug || existing.name, id);
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.icon !== undefined) data.icon = body.icon?.trim() || null;
    if (body.image !== undefined) data.image = body.image?.trim() || null;
    if (body.parentId !== undefined) data.parentId = body.parentId || null;
    if (body.order !== undefined) data.order = Number(body.order) || 0;

    const nextStatus = body.status !== undefined ? parseCategoryStatus(body.status) : null;
    if (body.status !== undefined && !nextStatus) {
      return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
    }
    if (nextStatus) data.status = nextStatus;

    const category = await db.category.update({
      where: { id },
      data,
    });

    if (nextStatus && nextStatus !== existing.status) {
      await logAdminAction(request, authz.user.id, 'taxonomy.category.status.update', 'Category', category.id, {
        oldStatus: existing.status,
        newStatus: nextStatus,
        slug: category.slug,
      });
    }

    await logAdminAction(request, authz.user.id, 'category.update', 'Category', category.id, {
      before: { id: existing.id, name: existing.name, slug: existing.slug, status: existing.status, parentId: existing.parentId },
      after: { id: category.id, name: category.name, slug: category.slug, status: category.status, parentId: category.parentId },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Super admin category PATCH error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:categories:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const existing = await db.category.findUnique({
      where: { id },
      include: {
        _count: { select: { children: true, requests: true, skills: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'دسته‌بندی یافت نشد' },
        { status: 404 }
      );
    }

    if (existing._count.children > 0 || existing._count.requests > 0 || existing._count.skills > 0) {
      const category = await db.category.update({
        where: { id },
        data: { status: 'DISABLED' },
      });

      await logAdminAction(request, authz.user.id, 'taxonomy.category.status.update', 'Category', category.id, {
        oldStatus: existing.status,
        newStatus: 'DISABLED',
        reason: 'has_dependencies',
        counts: existing._count,
      });

      return NextResponse.json({
        category,
        mode: 'deactivated',
        message: 'به دلیل داشتن وابستگی، دسته‌بندی به‌جای حذف غیرفعال شد',
      });
    }

    await db.category.delete({ where: { id } });

    await logAdminAction(request, authz.user.id, 'category.delete', 'Category', id, {
      mode: 'deleted',
    });

    return NextResponse.json({ success: true, mode: 'deleted' });
  } catch (error) {
    console.error('Super admin category DELETE error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
