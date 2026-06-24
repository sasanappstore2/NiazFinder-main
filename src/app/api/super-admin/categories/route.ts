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

async function makeUniqueSlug(baseValue: string) {
  const baseSlug = createSlug(baseValue) || `category-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (await db.category.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:categories:read');
    if (!authz.ok) return authz.response;

    const categories = await db.category.findMany({
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          include: {
            requests: { select: { id: true } },
            _count: { select: { requests: true, skills: true } },
          },
        },
        requests: { select: { id: true } },
        _count: { select: { requests: true, skills: true, children: true } },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    const tree = categories
      .filter((category) => !category.parentId)
      .map((category) => ({
        ...category,
        requestCount: category._count.requests,
        skillCount: category._count.skills,
        childCount: category._count.children,
        children: category.children.map((child) => ({
          ...child,
          requestCount: child._count.requests,
          skillCount: child._count.skills,
          childCount: 0,
        })),
      }));

    return NextResponse.json({
      categories: tree,
      flatCategories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        status: category.status,
        order: category.order,
      })),
    });
  } catch (error) {
    console.error('Super admin categories GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:categories:write');
    if (!authz.ok) return authz.response;

    const body: CategoryPayload = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: 'نام دسته‌بندی الزامی است' },
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

    const slug = body.slug?.trim()
      ? await makeUniqueSlug(body.slug)
      : await makeUniqueSlug(name);

    const status = parseCategoryStatus(body.status) ?? 'DISABLED';

    const category = await db.category.create({
      data: {
        name,
        slug,
        description: body.description?.trim() || null,
        icon: body.icon?.trim() || null,
        image: body.image?.trim() || null,
        parentId: body.parentId || null,
        order: Number.isFinite(body.order) ? Number(body.order) : 0,
        status,
      },
    });

    await logAdminAction(request, authz.user.id, 'category.create', 'Category', category.id, {
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      status: category.status,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Super admin categories POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
