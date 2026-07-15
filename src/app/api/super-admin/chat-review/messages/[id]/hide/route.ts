import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { publishCommEvent } from '@/lib/communication/redis-publish';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'comms:messages:moderate');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const existing = await db.message.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'پیام یافت نشد' }, { status: 404 });
    }

    const message = await db.message.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        conversationId: true,
        deletedAt: true,
      },
    });

    await logAdminAction(request, authz.user.id, 'comms.message.hide', 'Message', id, {
      conversationId: message.conversationId,
    });

    void publishCommEvent({
      type: 'message:delete',
      payload: {
        messageId: message.id,
        conversationId: message.conversationId,
        forEveryone: true,
        deletedBy: authz.user.id,
        adminHide: true,
      },
    });

    return NextResponse.json({
      message: {
        ...message,
        deletedAt: message.deletedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Super admin message hide error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
