import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { getPublicCategoryWhere } from '@/lib/categories/category-status';

export const runtime = 'nodejs';

const getActiveCategorySlugs = unstable_cache(
  async () => {
    const rows = await db.category.findMany({
      where: getPublicCategoryWhere(),
      select: { slug: true },
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => r.slug);
  },
  ['public-active-category-slugs'],
  { revalidate: 300, tags: ['categories'] }
);

export async function GET() {
  try {
    const slugs = await getActiveCategorySlugs();
    return NextResponse.json(
      { slugs },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Category active-slugs GET error:', error);
    return NextResponse.json(
      { slugs: ['real-estate'] },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=60' },
      }
    );
  }
}
