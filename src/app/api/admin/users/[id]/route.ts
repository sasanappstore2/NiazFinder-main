import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isAllowedSuperAdmin, isSuperAdminPhone } from '@/lib/super-admin';

// PATCH /api/admin/users/[id] - deprecated; use /api/super-admin/users/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: targetId } = await params;
    const body = await request.json();
    const { role, isActive, isBanned, banReason, isVerified, firstName, lastName, displayName } = body;

    const target = await db.user.findFirst({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (role) {
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
    if (typeof isBanned === 'boolean') {
      updateData.isBanned = isBanned;
      updateData.banReason = isBanned ? (banReason || 'محدودیت توسط مدیریت') : null;
    }
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;
    if (firstName) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (displayName !== undefined) updateData.displayName = displayName;

    const updated = await db.user.update({
      where: { id: targetId },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - admin delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: targetId } = await params;
    if (targetId === authUser.id) {
      return NextResponse.json({ error: 'نمی‌توانید حساب خود را حذف کنید' }, { status: 400 });
    }

    const target = await db.user.findFirst({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    if (target.role === 'SUPER_ADMIN' && !isAllowedSuperAdmin(authUser)) {
      return NextResponse.json(
        { error: 'تنها سوپرادمین اصلی مجاز به حذف حساب سوپرادمین است' },
        { status: 403 }
      );
    }

    await db.user.delete({ where: { id: targetId } });

    return NextResponse.json({ success: true, message: 'کاربر حذف شد' });
  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
