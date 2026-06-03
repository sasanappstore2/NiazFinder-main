import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import {
  countProfilesByOnlineStoreSlug,
  validateOnlineStorePayload,
  validateOnlineStoreSlug,
} from '@/lib/business/online-stores-admin';
import {
  readManagedOnlineStores,
  writeManagedOnlineStores,
  setOnlineStoresCache,
  type ManagedOnlineStoreCategory,
} from '@/lib/business/online-stores-registry';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:online-stores:read');
    if (!authz.ok) return authz.response;

    const categories = await readManagedOnlineStores();
    setOnlineStoresCache(categories);

    const profiles = await db.businessProfile.findMany({ select: { categorySlugs: true } });
    const profileCounts = countProfilesByOnlineStoreSlug(profiles);

    const sectors = categories.filter((c) => c.depth === 0);
    const activeCount = categories.filter((c) => c.isActive !== false).length;

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        profileCount: profileCounts.get(c.slug) ?? 0,
      })),
      sectors,
      stats: {
        total: categories.length,
        active: activeCount,
        sectors: sectors.length,
        leaves: categories.filter((c) => c.depth === 1).length,
      },
    });
  } catch (error) {
    console.error('Super admin online-stores GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:online-stores:write');
    if (!authz.ok) return authz.response;

    const body = await request.json();
    const categories = await readManagedOnlineStores();

    const slug = String(body.slug ?? '').trim();
    const slugErr = validateOnlineStoreSlug(slug);
    if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 });

    const next: ManagedOnlineStoreCategory = {
      slug,
      title: String(body.title ?? '').trim(),
      englishTitle: body.englishTitle ? String(body.englishTitle).trim() : undefined,
      parentSlug: body.parentSlug ?? null,
      depth: body.depth === 0 ? 0 : 1,
      sortOrder: Number(body.sortOrder ?? 9999),
      isActive: body.isActive !== false,
    };

    const err = validateOnlineStorePayload(next, categories);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const updated = [...categories, next];
    await writeManagedOnlineStores(updated);
    setOnlineStoresCache(updated);

    await logAdminAction(request, authz.user.id, 'online-store.create', 'OnlineStoreCategory', slug, next);

    return NextResponse.json({ category: next }, { status: 201 });
  } catch (error) {
    console.error('Super admin online-stores POST error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
