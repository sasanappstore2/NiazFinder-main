import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import {
  readManagedOccupations,
  writeManagedOccupations,
  setOccupationsCache,
  type ManagedBusinessOccupation,
} from '@/lib/business/occupations-registry';

export const runtime = 'nodejs';

function applyBulkActive(
  occupations: ManagedBusinessOccupation[],
  targetSlugs: Set<string>,
  isActive: boolean
): ManagedBusinessOccupation[] {
  const sectorSlugs = new Set(
    occupations.filter((o) => o.depth === 0 && targetSlugs.has(o.slug)).map((o) => o.slug)
  );

  return occupations.map((o) => {
    if (targetSlugs.has(o.slug)) {
      return { ...o, isActive };
    }
    if (!isActive && o.depth === 1 && o.parentSlug && sectorSlugs.has(o.parentSlug)) {
      return { ...o, isActive: false };
    }
    return o;
  });
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:business-occupations:write');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const slugs = Array.isArray(body.slugs)
      ? body.slugs.filter((s: unknown) => typeof s === 'string' && s.trim())
      : [];
    const isActive = Boolean(body.isActive);

    if (slugs.length === 0) {
      return NextResponse.json({ error: 'slugها الزامی است' }, { status: 400 });
    }

    const occupations = await readManagedOccupations();
    const targetSlugs = new Set<string>(slugs);
    const updated = applyBulkActive(occupations, targetSlugs, isActive);

    await writeManagedOccupations(updated);
    setOccupationsCache(updated);

    await logAdminAction(request, authz.user.id, 'business-occupation.bulk', 'BusinessOccupation', slugs.join(','), {
      slugs,
      isActive,
    });

    const changed = updated.filter((o, i) => o.isActive !== occupations[i]?.isActive).length;

    return NextResponse.json({ updated: changed, isActive });
  } catch (error) {
    console.error('Super admin business-occupations bulk error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
