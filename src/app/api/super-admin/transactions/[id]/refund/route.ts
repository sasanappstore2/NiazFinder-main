import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'billing:transactions:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'تراکنش یافت نشد' }, { status: 404 });
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'این تراکنش قبلاً لغو شده است' }, { status: 400 });
    }

    const description = [existing.description, note || 'بازپرداخت توسط ادمین']
      .filter(Boolean)
      .join(' — ');

    const transaction = await db.transaction.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        type: 'REFUND',
        description,
      },
    });

    await logAdminAction(request, authz.user.id, 'billing.transaction.refund', 'Transaction', id, {
      previousStatus: existing.status,
      previousType: existing.type,
    });

    return NextResponse.json({
      message: 'تراکنش به‌عنوان بازپرداخت علامت‌گذاری شد',
      transaction: {
        ...transaction,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Super admin transaction refund error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
