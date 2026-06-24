import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import type { BusinessMemberRole } from '@prisma/client';

export const runtime = 'nodejs';

async function getProfileId(id: string) {
  const profile = await db.businessProfile.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  return profile;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:read');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const profile = await getProfileId(id);
    if (!profile) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const [members, invites, owner] = await Promise.all([
      db.businessMember.findMany({
        where: { profileId: id, status: { not: 'REMOVED' } },
        include: {
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
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      }),
      db.businessMemberInvite.findMany({
        where: { profileId: id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.findUnique({
        where: { id: profile.userId },
        select: {
          id: true,
          phone: true,
          displayName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      }),
    ]);

    return NextResponse.json({
      owner,
      members: members.map((m) => ({
        ...m,
        joinedAt: m.joinedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      invites: invites.map((i) => ({
        ...i,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Super admin business members GET error:', error);
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
    const profile = await getProfileId(id);
    if (!profile) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const memberUserId = typeof body.userId === 'string' ? body.userId : '';
    if (!memberUserId) {
      return NextResponse.json({ error: 'userId الزامی است' }, { status: 400 });
    }

    const member = await db.businessMember.findUnique({
      where: { profileId_userId: { profileId: id, userId: memberUserId } },
    });
    if (!member || member.status === 'REMOVED') {
      return NextResponse.json({ error: 'عضو یافت نشد' }, { status: 404 });
    }
    if (member.role === 'OWNER') {
      return NextResponse.json({ error: 'نقش مالک قابل تغییر نیست' }, { status: 400 });
    }

    const role = body.role as BusinessMemberRole | undefined;
    if (role !== 'MANAGER' && role !== 'STAFF') {
      return NextResponse.json({ error: 'نقش نامعتبر است' }, { status: 400 });
    }

    const updated = await db.businessMember.update({
      where: { id: member.id },
      data: { role },
    });

    await logAdminAction(request, authz.user.id, 'market.business.member.update', 'BusinessMember', member.id, {
      profileId: id,
      userId: memberUserId,
      role,
    });

    return NextResponse.json({
      member: {
        ...updated,
        joinedAt: updated.joinedAt.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Super admin business members PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const profile = await getProfileId(id);
    if (!profile) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const memberUserId = searchParams.get('userId')?.trim() || '';
    if (!memberUserId) {
      return NextResponse.json({ error: 'userId الزامی است' }, { status: 400 });
    }

    const member = await db.businessMember.findUnique({
      where: { profileId_userId: { profileId: id, userId: memberUserId } },
    });
    if (!member || member.status === 'REMOVED') {
      return NextResponse.json({ error: 'عضو یافت نشد' }, { status: 404 });
    }
    if (member.role === 'OWNER') {
      return NextResponse.json({ error: 'مالک قابل حذف نیست' }, { status: 400 });
    }

    await db.businessContactPoint.updateMany({
      where: { profileId: id, assignedUserId: memberUserId },
      data: { isPublished: false },
    });
    await db.businessMember.update({
      where: { id: member.id },
      data: { status: 'REMOVED' },
    });

    await logAdminAction(request, authz.user.id, 'market.business.member.remove', 'BusinessMember', member.id, {
      profileId: id,
      userId: memberUserId,
    });

    return NextResponse.json({ message: 'عضو حذف شد' });
  } catch (error) {
    console.error('Super admin business members DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
