import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authz = await requirePermission(request, 'billing:transactions:read');
    if (!authz.ok) return authz.response;

    const { userId } = await params;

    const wallet = await db.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, phone: true, displayName: true, firstName: true, lastName: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'کیف پول یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        frozen: wallet.frozen,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
        user: wallet.user,
        recentTransactions: wallet.transactions.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Super admin wallet GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
