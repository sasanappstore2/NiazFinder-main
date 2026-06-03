import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import type { BusinessStatus } from '@prisma/client';

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
      select: {
        id: true,
        userId: true,
        name: true,
        slug: true,
        logo: true,
        coverImage: true,
        description: true,
        city: true,
        province: true,
        status: true,
        verified: true,
        leadAlertsEnabled: true,
        chatEnabled: true,
        rating: true,
        reviewCount: true,
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
          },
        },
      },
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

    const data: {
      status?: BusinessStatus;
      verified?: boolean;
      leadAlertsEnabled?: boolean;
    } = {};

    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') {
      data.status = body.status;
    }
    if (typeof body.verified === 'boolean') data.verified = body.verified;
    if (typeof body.leadAlertsEnabled === 'boolean') {
      data.leadAlertsEnabled = body.leadAlertsEnabled;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'فیلدی برای به‌روزرسانی ارسال نشده' }, { status: 400 });
    }

    const business = await db.businessProfile.update({
      where: { id },
      data,
    });

    await logAdminAction(request, authz.user.id, 'market.business.update', 'BusinessProfile', id, {
      updates: data,
    });

    return NextResponse.json({ business: serializeBusiness(business) });
  } catch (error) {
    console.error('Super admin business PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
