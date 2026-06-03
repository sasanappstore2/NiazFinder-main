import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';

export const runtime = 'nodejs';

type ModerateAction = 'approve' | 'reject' | 'suspend';

function parseAction(value: unknown): ModerateAction | null {
  if (value === 'approve' || value === 'reject' || value === 'suspend') return value;
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:moderate');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = parseAction(body.action);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!action) {
      return NextResponse.json({ error: 'اقدام نامعتبر است' }, { status: 400 });
    }

    const existing = await db.businessProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const data =
      action === 'approve'
        ? { status: 'ACTIVE' as const, verified: true }
        : action === 'reject'
          ? { status: 'INACTIVE' as const, verified: false }
          : { status: 'INACTIVE' as const };

    const business = await db.businessProfile.update({
      where: { id },
      data,
    });

    await logAdminAction(request, authz.user.id, `market.business.moderate.${action}`, 'BusinessProfile', id, {
      reason: reason || undefined,
      previousStatus: existing.status,
      previousVerified: existing.verified,
    });

    return NextResponse.json({
      message: 'اقدام ثبت شد',
      business: {
        ...business,
        createdAt: business.createdAt.toISOString(),
        updatedAt: business.updatedAt.toISOString(),
        onboardingCompletedAt: business.onboardingCompletedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Super admin business moderate error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
