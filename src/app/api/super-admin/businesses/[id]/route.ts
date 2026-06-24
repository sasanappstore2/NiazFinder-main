import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { buildBusinessProfilePatch } from '@/lib/admin/business-profile-patch';
import { queueBusinessProfileTypesenseSync } from '@/lib/search/typesense-sync';

export const runtime = 'nodejs';

function serializeBusiness(b: {
  createdAt: Date;
  updatedAt: Date;
  onboardingCompletedAt: Date | null;
  [key: string]: unknown;
}) {
  return {
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    onboardingCompletedAt: b.onboardingCompletedAt?.toISOString() ?? null,
  };
}

const DETAIL_SELECT = {
  id: true,
  userId: true,
  name: true,
  slug: true,
  logo: true,
  coverImage: true,
  description: true,
  categorySlugs: true,
  tags: true,
  city: true,
  province: true,
  address: true,
  lat: true,
  lng: true,
  status: true,
  verified: true,
  leadAlertsEnabled: true,
  chatEnabled: true,
  rating: true,
  reviewCount: true,
  trustScore: true,
  phone: true,
  whatsapp: true,
  email: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
  onboardingCompletedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      phone: true,
      displayName: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  _count: {
    select: {
      offers: true,
      portfolioItems: true,
      profileReviews: true,
      leadOutreach: true,
      members: true,
    },
  },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:read');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const business = await db.businessProfile.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    });

    if (!business) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ business: serializeBusiness(business) });
  } catch (error) {
    console.error('Super admin business GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const existing = await db.businessProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const patch = buildBusinessProfilePatch(body, existing.slug);
    if (!patch.ok) {
      return NextResponse.json({ error: patch.error }, { status: 400 });
    }

    if (patch.slugChanged && typeof patch.data.slug === 'string') {
      const slugTaken = await db.businessProfile.findFirst({
        where: { slug: patch.data.slug, NOT: { id } },
        select: { id: true },
      });
      if (slugTaken) {
        return NextResponse.json({ error: 'این slug قبلاً استفاده شده است' }, { status: 409 });
      }
    }

    const business = await db.businessProfile.update({
      where: { id },
      data: patch.data,
    });

    if (
      patch.slugChanged ||
      patch.data.status !== undefined ||
      patch.data.verified !== undefined ||
      patch.data.name !== undefined
    ) {
      queueBusinessProfileTypesenseSync(id);
    }

    await logAdminAction(request, authz.user.id, 'market.business.update', 'BusinessProfile', id, {
      updates: patch.data,
    });

    return NextResponse.json({ business: serializeBusiness(business) });
  } catch (error) {
    console.error('Super admin business PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
