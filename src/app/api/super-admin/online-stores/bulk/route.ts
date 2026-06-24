import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import {
  readManagedOnlineStores,
  writeManagedOnlineStores,
  setOnlineStoresCache,
  type ManagedOnlineStoreCategory,
} from '@/lib/business/online-stores-registry';

export const runtime = 'nodejs';

function applyBulkActive(
  categories: ManagedOnlineStoreCategory[],
  targetSlugs: Set<string>,
  isActive: boolean
): ManagedOnlineStoreCategory[] {
  const sectorSlugs = new Set(
    categories.filter((c) => c.depth === 0 && targetSlugs.has(c.slug)).map((c) => c.slug)
  );

  return categories.map((c) => {
    if (targetSlugs.has(c.slug)) {
      return { ...c, isActive };
    }
    if (!isActive && c.depth === 1 && c.parentSlug && sectorSlugs.has(c.parentSlug)) {
      return { ...c, isActive: false };
    }
    return c;
  });
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:online-stores:write');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const slugs = Array.isArray(body.slugs)
      ? body.slugs.filter((s: unknown) => typeof s === 'string' && s.trim())
      : [];
    const isActive = Boolean(body.isActive);

    if (slugs.length === 0) {
      return NextResponse.json({ error: 'slugها الزامی است' }, { status: 400 });
    }

    const categories = await readManagedOnlineStores();
    const targetSlugs = new Set<string>(slugs);
    const updated = applyBulkActive(categories, targetSlugs, isActive);

    await writeManagedOnlineStores(updated);
    setOnlineStoresCache(updated);

    await logAdminAction(request, authz.user.id, 'online-store.bulk', 'OnlineStoreCategory', slugs.join(','), {
      slugs,
      isActive,
    });

    const changed = updated.filter((c, i) => c.isActive !== categories[i]?.isActive).length;

    return NextResponse.json({ updated: changed, isActive });
  } catch (error) {
    console.error('Super admin online-stores bulk error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
