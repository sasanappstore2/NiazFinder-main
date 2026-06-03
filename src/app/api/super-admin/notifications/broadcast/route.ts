import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import type { UserRole } from '@prisma/client';

export const runtime = 'nodejs';

const SEGMENT_ROLES: UserRole[] = ['CLIENT', 'SPECIALIST', 'ADMIN'];

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'comms:notifications:write');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const role = typeof body.role === 'string' ? body.role.trim() : 'ALL';

    if (!title || !message) {
      return NextResponse.json({ error: 'عنوان و متن اعلان الزامی است' }, { status: 400 });
    }

    const userWhere =
      role === 'ALL'
        ? { isActive: true, isBanned: false }
        : SEGMENT_ROLES.includes(role as UserRole)
          ? { role: role as UserRole, isActive: true, isBanned: false }
          : null;

    if (!userWhere) {
      return NextResponse.json({ error: 'بخش نقش نامعتبر است' }, { status: 400 });
    }

    const users = await db.user.findMany({
      where: userWhere,
      select: { id: true },
      take: 5000,
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'کاربری برای ارسال یافت نشد' }, { status: 404 });
    }

    const dataPayload = JSON.stringify({
      broadcast: true,
      role,
      sentBy: authz.user.id,
    });

    await db.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: 'ADMIN_BROADCAST',
        title,
        message,
        data: dataPayload,
      })),
    });

    await logAdminAction(request, authz.user.id, 'comms.notification.broadcast', 'Notification', null, {
      role,
      recipientCount: users.length,
      title,
    });

    return NextResponse.json({
      message: `اعلان برای ${users.length.toLocaleString('fa-IR')} کاربر ارسال شد`,
      recipientCount: users.length,
    });
  } catch (error) {
    console.error('Super admin notification broadcast error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
