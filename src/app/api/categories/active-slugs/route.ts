import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPublicCategoryWhere } from '@/lib/categories/category-status';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rows = await db.category.findMany({
      where: getPublicCategoryWhere(),
      select: { slug: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({
      slugs: rows.map((r) => r.slug),
    });
  } catch (error) {
    console.error('Category active-slugs GET error:', error);
    return NextResponse.json({ slugs: ['real-estate'] }, { status: 200 });
  }
}
