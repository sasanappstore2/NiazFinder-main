import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { countProfilesByOnlineStoreSlug } from '@/lib/business/online-stores-admin';
import { readManagedOnlineStores } from '@/lib/business/online-stores-registry';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:online-stores:read');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const categories = await readManagedOnlineStores();
    const row = categories.find((c) => c.slug === slug);
    if (!row) {
      return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });
    }

    const profiles = await db.businessProfile.findMany({ select: { categorySlugs: true } });
    const profileCounts = countProfilesByOnlineStoreSlug(profiles);

    const childLeaves =
      row.depth === 0 ? categories.filter((c) => c.parentSlug === slug && c.depth === 1) : [];

    let profileCount = profileCounts.get(slug) ?? 0;
    let activeChildren = 0;

    if (row.depth === 0) {
      for (const leaf of childLeaves) {
        profileCount += profileCounts.get(leaf.slug) ?? 0;
        if (leaf.isActive !== false) activeChildren += 1;
      }
    }

    return NextResponse.json({
      slug: row.slug,
      depth: row.depth,
      profileCount,
      activeChildren,
      totalChildren: childLeaves.length,
    });
  } catch (error) {
    console.error('Super admin online-store impact GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
