import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { isCategorySlug } from '@/config/categories';
import {
  countProfilesByOccupationSlug,
  validateOccupationPayload,
  validateOccupationSlug,
} from '@/lib/business/occupations-admin';
import {
  readManagedOccupations,
  writeManagedOccupations,
  setOccupationsCache,
  type ManagedBusinessOccupation,
} from '@/lib/business/occupations-registry';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:business-occupations:read');
    if (!authz.ok) return authz.response;

    const occupations = await readManagedOccupations();
    setOccupationsCache(occupations);

    const profiles = await db.businessProfile.findMany({ select: { categorySlugs: true } });
    const profileCounts = countProfilesByOccupationSlug(profiles);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';
    const sector = searchParams.get('sector')?.trim() || '';

    let filtered = occupations;
    if (sector) filtered = filtered.filter((o) => o.slug === sector || o.parentSlug === sector);
    if (q) {
      filtered = filtered.filter(
        (o) =>
          o.slug.includes(q) ||
          o.title.toLowerCase().includes(q) ||
          (o.englishTitle?.toLowerCase().includes(q) ?? false)
      );
    }

    const sectors = occupations.filter((o) => o.depth === 0);
    const activeCount = occupations.filter((o) => o.isActive !== false).length;

    return NextResponse.json({
      occupations: filtered.map((o) => ({
        ...o,
        profileCount: profileCounts.get(o.slug) ?? 0,
      })),
      sectors,
      stats: {
        total: occupations.length,
        active: activeCount,
        sectors: sectors.length,
        jobs: occupations.filter((o) => o.depth === 1).length,
      },
    });
  } catch (error) {
    console.error('Super admin business-occupations GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'taxonomy:business-occupations:write');
    if (!authz.ok) return authz.response;

    const body = await request.json();
    const occupations = await readManagedOccupations();

    const slug = String(body.slug ?? '').trim();
    const slugErr = validateOccupationSlug(slug);
    if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 });
    if (isCategorySlug(slug)) {
      return NextResponse.json({ error: 'slug با دسته نیاز تداخل دارد' }, { status: 400 });
    }

    const next: ManagedBusinessOccupation = {
      slug,
      title: String(body.title ?? '').trim(),
      englishTitle: body.englishTitle ? String(body.englishTitle).trim() : undefined,
      parentSlug: body.parentSlug ?? null,
      depth: body.depth === 0 ? 0 : 1,
      sortOrder: Number(body.sortOrder ?? 9999),
      isActive: body.isActive !== false,
    };

    const err = validateOccupationPayload(next, occupations);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const updated = [...occupations, next];
    await writeManagedOccupations(updated);
    setOccupationsCache(updated);

    await logAdminAction(request, authz.user.id, 'business-occupation.create', 'BusinessOccupation', slug, next);

    return NextResponse.json({ occupation: next }, { status: 201 });
  } catch (error) {
    console.error('Super admin business-occupations POST error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
