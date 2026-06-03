import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import {
  readManagedOccupations,
  writeManagedOccupations,
  setOccupationsCache,
  type ManagedBusinessOccupation,
} from '@/lib/business/occupations-registry';
import { validateOccupationPayload } from '@/lib/business/occupations-admin';
import { db } from '@/lib/db';
import { parseJsonArray } from '@/lib/business/json-fields';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:business-occupations:write');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const body = await request.json();
    const occupations = await readManagedOccupations();
    const index = occupations.findIndex((o) => o.slug === slug);
    if (index < 0) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    const current = occupations[index];
    const next: ManagedBusinessOccupation = {
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

    const err = validateOccupationPayload(next, occupations, slug);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const updated = [...occupations];
    updated[index] = next;
    await writeManagedOccupations(updated);
    setOccupationsCache(updated);

    await logAdminAction(request, authz.user.id, 'business-occupation.update', 'BusinessOccupation', slug, body);

    return NextResponse.json({ occupation: next });
  } catch (error) {
    console.error('Super admin business-occupation PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:business-occupations:write');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const occupations = await readManagedOccupations();
    const index = occupations.findIndex((o) => o.slug === slug);
    if (index < 0) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    const profiles = await db.businessProfile.findMany({ select: { categorySlugs: true } });
    const inUse = profiles.some((p) => parseJsonArray<string>(p.categorySlugs).includes(slug));

    const updated = [...occupations];
    if (inUse) {
      updated[index] = { ...updated[index], isActive: false };
    } else {
      updated.splice(index, 1);
    }

    await writeManagedOccupations(updated);
    setOccupationsCache(updated);

    await logAdminAction(
      request,
      authz.user.id,
      inUse ? 'business-occupation.deactivate' : 'business-occupation.delete',
      'BusinessOccupation',
      slug,
      { inUse }
    );

    return NextResponse.json({ ok: true, deactivated: inUse });
  } catch (error) {
    console.error('Super admin business-occupation DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
