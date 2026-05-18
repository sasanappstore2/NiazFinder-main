import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSlug, getAuthUser } from '@/lib/auth';
import { isAllowedSuperAdmin } from '@/lib/super-admin';

interface CategoryPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  parentId?: string | null;
  order?: number;
  isActive?: boolean;
}

async function requireSuperAdmin(request: NextRequest) {
  const authUser = await getAuthUser(request);
  return isAllowedSuperAdmin(authUser);
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
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json(
        { error: 'این بخش فقط برای سوپرادمین اصلی فعال است' },
        { status: 403 }
      );
    }

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
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    const category = await db.category.update({
      where: { id },
      data,
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
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json(
        { error: 'این بخش فقط برای سوپرادمین اصلی فعال است' },
        { status: 403 }
      );
    }

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
        data: { isActive: false },
      });

      return NextResponse.json({
        category,
        mode: 'deactivated',
        message: 'به دلیل داشتن وابستگی، دسته‌بندی به‌جای حذف غیرفعال شد',
      });
    }

    await db.category.delete({ where: { id } });

    return NextResponse.json({ success: true, mode: 'deleted' });
  } catch (error) {
    console.error('Super admin category DELETE error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
