import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { getBusinessTeamAccess } from '@/lib/business/team/access';
import type { BusinessMemberRole } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const { userId: targetUserId } = await params;
  const profile = await loadMyBusinessProfile(access.user);
  const teamAccess = await getBusinessTeamAccess(profile.id, access.user.id);
  if (!teamAccess?.canManageTeam) {
    return NextResponse.json({ error: 'فقط مالک می‌تواند تیم را مدیریت کند' }, { status: 403 });
  }

  const member = await db.businessMember.findUnique({
    where: { profileId_userId: { profileId: profile.id, userId: targetUserId } },
  });
  if (!member || member.status === 'REMOVED') {
    return NextResponse.json({ error: 'عضو یافت نشد' }, { status: 404 });
  }
  if (member.role === 'OWNER') {
    return NextResponse.json({ error: 'نقش مالک قابل تغییر نیست' }, { status: 400 });
  }

  const body = await request.json();

  if (body.action === 'remove') {
    await db.businessContactPoint.updateMany({
      where: { profileId: profile.id, assignedUserId: targetUserId },
      data: { isPublished: false },
    });
    await db.businessMember.update({
      where: { id: member.id },
      data: { status: 'REMOVED' },
    });
    return NextResponse.json({ ok: true, removed: true });
  }

  const role = body.role as BusinessMemberRole | undefined;
  if (role && (role === 'MANAGER' || role === 'STAFF')) {
    const updated = await db.businessMember.update({
      where: { id: member.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            phone: true,
          },
        },
      },
    });
    return NextResponse.json({ member: updated });
  }

  return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
}
