import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:proposals:moderate');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x: unknown): x is string => typeof x === 'string')
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'لیست خالی است' }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ error: 'حداکثر ۱۰۰ آیتم' }, { status: 400 });
    }

    const result = await db.proposal.updateMany({
      where: { id: { in: ids }, status: { not: 'REJECTED' } },
      data: { status: 'REJECTED' },
    });

    await logAdminAction(request, authz.user.id, 'market.proposal.bulk_reject', 'Proposal', ids[0], {
      ids,
      count: result.count,
    });

    return NextResponse.json({
      message: `${result.count.toLocaleString('fa-IR')} پیشنهاد رد شد`,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error('Super admin proposals bulk reject error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
