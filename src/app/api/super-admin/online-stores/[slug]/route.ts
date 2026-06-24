import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { db } from '@/lib/db';
import { parseJsonArray } from '@/lib/business/json-fields';
import { validateOnlineStorePayload } from '@/lib/business/online-stores-admin';
import {
  readManagedOnlineStores,
  writeManagedOnlineStores,
  setOnlineStoresCache,
  type ManagedOnlineStoreCategory,
} from '@/lib/business/online-stores-registry';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:online-stores:write');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const body = await request.json();
    const categories = await readManagedOnlineStores();
    const index = categories.findIndex((c) => c.slug === slug);
    if (index < 0) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    const current = categories[index];
    const next: ManagedOnlineStoreCategory = {
      ...current,
      title: body.title !== undefined ? String(body.title).trim() : current.title,
      englishTitle:
        body.englishTitle !== undefined
          ? body.englishTitle
            ? String(body.englishTitle).trim()
            : undefined
          : current.englishTitle,
      parentSlug: body.parentSlug !== undefined ? body.parentSlug : current.parentSlug,
      depth: body.depth !== undefined ? (body.depth === 0 ? 0 : 1) : current.depth,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : current.sortOrder,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : current.isActive,
    };

    const err = validateOnlineStorePayload(next, categories, slug);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const updated = [...categories];
    updated[index] = next;

    if (next.depth === 0 && next.isActive === false) {
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].parentSlug === slug && updated[i].depth === 1) {
          updated[i] = { ...updated[i], isActive: false };
        }
      }
    }

    await writeManagedOnlineStores(updated);
    setOnlineStoresCache(updated);

    await logAdminAction(request, authz.user.id, 'online-store.update', 'OnlineStoreCategory', slug, body);

    return NextResponse.json({ category: next });
  } catch (error) {
    console.error('Super admin online-store PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:online-stores:write');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const categories = await readManagedOnlineStores();
    const index = categories.findIndex((c) => c.slug === slug);
    if (index < 0) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    const profiles = await db.businessProfile.findMany({ select: { categorySlugs: true } });
    const inUse = profiles.some((p) => parseJsonArray<string>(p.categorySlugs).includes(slug));

    const updated = [...categories];
    if (inUse) {
      updated[index] = { ...updated[index], isActive: false };
    } else {
      updated.splice(index, 1);
    }

    await writeManagedOnlineStores(updated);
    setOnlineStoresCache(updated);

    await logAdminAction(
      request,
      authz.user.id,
      inUse ? 'online-store.deactivate' : 'online-store.delete',
      'OnlineStoreCategory',
      slug,
      { inUse }
    );

    return NextResponse.json({ ok: true, deactivated: inUse });
  } catch (error) {
    console.error('Super admin online-store DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
