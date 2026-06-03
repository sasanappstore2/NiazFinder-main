import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:proposals:moderate');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body.status !== 'REJECTED') {
      return NextResponse.json({ error: 'فقط رد پیشنهاد پشتیبانی می‌شود' }, { status: 400 });
    }

    const existing = await db.proposal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'پیشنهاد یافت نشد' }, { status: 404 });
    }

    const proposal = await db.proposal.update({
      where: { id },
      data: { status: 'REJECTED' },
      select: {
        id: true,
        price: true,
        status: true,
        message: true,
        createdAt: true,
        userId: true,
        requestId: true,
      },
    });

    await logAdminAction(request, authz.user.id, 'market.proposal.reject', 'Proposal', id, {
      previousStatus: existing.status,
    });

    return NextResponse.json({
      proposal: { ...proposal, createdAt: proposal.createdAt.toISOString() },
    });
  } catch (error) {
    console.error('Super admin proposal PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
