import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logModerationAudit } from '@/lib/rbac/moderation-audit';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:requests:moderate');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const existing = await db.serviceRequest.findUnique({
      where: { id },
      select: { id: true, moderationStatus: true, assignedToUserId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
    }

    if (existing.moderationStatus !== 'PENDING') {
      return NextResponse.json({ error: 'فقط آیتم‌های در صف قابل claim هستند' }, { status: 409 });
    }

    if (existing.assignedToUserId && existing.assignedToUserId !== authz.user.id) {
      return NextResponse.json({ error: 'این آیتم به کارمند دیگری اختصاص دارد' }, { status: 409 });
    }

    const updated = await db.serviceRequest.update({
      where: { id },
      data: { assignedToUserId: authz.user.id },
      select: { id: true, assignedToUserId: true },
    });

    await logModerationAudit({
      actorUserId: authz.user.id,
      action: 'request.moderate.claim',
      entityId: id,
      payload: { assignedToUserId: authz.user.id },
    });

    return NextResponse.json({ message: 'اختصاص داده شد', request: updated });
  } catch (error) {
    console.error('Super admin claim error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
