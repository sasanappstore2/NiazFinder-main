import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ============ GET handler ============
// Returns popular categories + recent searches + matching suggestions

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    // 1. Fetch popular categories (always returned)
    const popularCategories = await db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { order: 'asc' },
      take: 8,
      select: { id: true, name: true, slug: true, icon: true, _count: { select: { requests: true } } },
    });

    // Map categories to a flat format with request count
    const categorySuggestions = popularCategories.map((c) => ({
      id: `cat-${c.id}`,
      type: 'category' as const,
      title: c.name,
      description: `${c._count.requests} نیاز ثبت شده`,
      icon: c.icon,
      slug: c.slug,
    }));

    // 2. If there's a query, also fetch matching requests and subcategories
    if (q.length >= 1) {
      const whereRequests: Prisma.ServiceRequestWhereInput = {
        status: 'OPEN',
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { tags: { contains: q } },
        ],
      };

      const whereCategories: Prisma.CategoryWhereInput = {
        isActive: true,
        parentId: null,
        OR: [
          { name: { contains: q } },
        ],
      };

      const whereSubcategories: Prisma.CategoryWhereInput = {
        isActive: true,
        parentId: { not: null },
        OR: [
          { name: { contains: q } },
        ],
      };

      const [matchingRequests, matchingCategories, matchingSubcategories] = await Promise.all([
        db.serviceRequest.findMany({
          where: whereRequests,
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            category: { select: { name: true } },
            createdAt: true,
          },
        }),
        db.category.findMany({
          where: whereCategories,
          orderBy: { order: 'asc' },
          take: 5,
          select: { id: true, name: true, slug: true, icon: true, _count: { select: { requests: true } } },
        }),
        db.category.findMany({
          where: whereSubcategories,
          orderBy: { order: 'asc' },
          take: 5,
          select: { id: true, name: true, slug: true, icon: true, parent: { select: { name: true } } },
        }),
      ]);

      const requestSuggestions = matchingRequests.map((r) => ({
        id: `req-${r.id}`,
        type: 'request' as const,
        title: r.title,
        description: r.description.substring(0, 80),
        category: r.category?.name,
        priority: r.priority,
      }));

      const matchCategories = matchingCategories.map((c) => ({
        id: `cat-${c.id}`,
        type: 'category' as const,
        title: c.name,
        description: `${c._count.requests} نیاز ثبت شده`,
        icon: c.icon,
        slug: c.slug,
      }));

      const matchSubcategories = matchingSubcategories.map((c) => ({
        id: `subcat-${c.id}`,
        type: 'subcategory' as const,
        title: c.name,
        description: c.parent?.name || '',
        icon: c.icon,
        slug: c.slug,
      }));

      return NextResponse.json({
        suggestions: [...matchCategories, ...matchSubcategories, ...requestSuggestions],
        categories: categorySuggestions,
      });
    }

    // No query: just return popular categories as suggestions
    return NextResponse.json({
      suggestions: categorySuggestions,
      categories: categorySuggestions,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است', suggestions: [], categories: [] },
      { status: 500 }
    );
  }
}
