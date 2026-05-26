import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/rbac/authz';
import { isSuperAdminPhone } from '@/lib/super-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await authorize(request);
    if (!authz.ok) return authz.response;

    const isOwner = authz.user.role === 'SUPER_ADMIN' && isSuperAdminPhone(authz.user.phone);
    const permissions = authz.permissions.has('*')
      ? ['*']
      : [...authz.permissions];

    const hasAccess =
      isOwner ||
      permissions.includes('*') ||
      permissions.includes('superadmin:access') ||
      permissions.length > 0;

    if (!hasAccess) {
      return NextResponse.json({ error: 'دسترسی کافی ندارید' }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        id: authz.user.id,
        phone: authz.user.phone,
        email: authz.user.email,
        role: authz.user.role,
        displayName: authz.user.displayName,
        firstName: authz.user.firstName,
        lastName: authz.user.lastName,
      },
      permissions,
      isOwner,
    });
  } catch (error) {
    console.error('Super admin me GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
