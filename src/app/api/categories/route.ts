import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============ TYPES ============

interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  order: number;
  requestCount: number;
  children: CategoryTreeItem[];
}

// ============ GET handler ============

export async function GET() {
  try {
    // Fetch all active categories
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        requests: {
          select: { id: true },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    // Get subcategory request counts
    const subcategoryIds = categories
      .flatMap((c) => c.children)
      .map((c) => c.id);

    const subcategoryRequestCounts = subcategoryIds.length > 0
      ? await db.serviceRequest.groupBy({
          by: ['categoryId'],
          where: { categoryId: { in: subcategoryIds } },
          _count: { id: true },
        })
      : [];

    const subCountMap = new Map(
      subcategoryRequestCounts.map((r) => [r.categoryId, r._count.id])
    );

    // Build category tree (only root categories)
    const rootCategories = categories.filter((c) => !c.parentId);

    const buildTree = (category: typeof categories[number]): CategoryTreeItem => {
      const childCategories = (category.children || []).map((child) => {
        const childWithCount = {
          ...child,
          requestCount: subCountMap.get(child.id) || 0,
        };
        return buildTree(childWithCount);
      });

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        image: category.image,
        parentId: category.parentId,
        order: category.order,
        requestCount: category.requests.length,
        children: childCategories,
      };
    };

    const tree: CategoryTreeItem[] = rootCategories.map(buildTree);

    return NextResponse.json({ categories: tree });
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
