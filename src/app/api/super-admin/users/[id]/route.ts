import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { isAllowedSuperAdmin, isSuperAdminPhone } from '@/lib/super-admin';
import { getAuthUser } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { queueBusinessProfileSearchSyncByUserId } from '@/lib/rag/sync';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'crm:users:read');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const user = await db.user.findFirst({
      where: { id },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        isVerified: true,
        city: true,
        province: true,
        avatar: true,
        bio: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        businessProfile: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            verified: true,
          },
        },
        _count: {
          select: {
            requests: true,
            sentProposals: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const { _count, businessProfile, ...rest } = user;

    return NextResponse.json({
      user: {
        ...rest,
        lastSeenAt: rest.lastSeenAt?.toISOString() ?? null,
        createdAt: rest.createdAt.toISOString(),
        updatedAt: rest.updatedAt.toISOString(),
        counts: {
          requests: _count.requests,
          proposals: _count.sentProposals,
          businessProfile: businessProfile ? 1 : 0,
        },
        businessProfile,
      },
    });
  } catch (error) {
    console.error('Super admin user GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetId } = await params;
    const body = await request.json();
    const { role, isActive, isBanned, banReason, isVerified, firstName, lastName, displayName } = body;

    // Base permission: update user fields
    const authz = await requirePermission(request, 'crm:users:write');
    if (!authz.ok) return authz.response;

    const target = await db.user.findFirst({ where: { id: targetId } });
    if (!target) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    const updateData: Record<string, unknown> = {};

    if (role) {
      // Role changes require stronger permission
      const authzRole = await requirePermission(request, 'crm:users:roles:write');
      if (!authzRole.ok) return authzRole.response;

      if (role === 'SUPER_ADMIN') {
        if (!isAllowedSuperAdmin(authUser) || !isSuperAdminPhone(target.phone)) {
          return NextResponse.json(
            { error: 'فقط مالک شماره سوپرادمین می‌تواند نقش SUPER_ADMIN داشته باشد' },
            { status: 403 }
          );
        }
      }

      if (target.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN' && !isAllowedSuperAdmin(authUser)) {
        return NextResponse.json(
          { error: 'تنها سوپرادمین اصلی مجاز به تغییر نقش سوپرادمین است' },
          { status: 403 }
        );
      }

      updateData.role = role;
    }

    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;

    if (typeof isBanned === 'boolean') {
      updateData.isBanned = isBanned;
      updateData.banReason = isBanned ? (banReason || 'محدودیت توسط مدیریت') : null;
    }

    if (typeof firstName === 'string') updateData.firstName = firstName;
    if (typeof lastName === 'string') updateData.lastName = lastName;
    if (typeof displayName === 'string') updateData.displayName = displayName;

    const user = await db.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAdminAction(request, authUser.id, 'crm.user.update', 'User', targetId, {
      updates: updateData,
    });

    if (typeof updateData.isActive === 'boolean') {
      queueBusinessProfileSearchSyncByUserId(targetId);
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Super admin user PATCH error:', error);
    const message = error instanceof Error ? error.message : 'خطای سرور رخ داده است';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

