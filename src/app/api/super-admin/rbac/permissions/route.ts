import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { ensureStaffPermissions } from '@/lib/rbac/ensure-staff-permissions';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'rbac:roles:read');
    if (!authz.ok) return authz.response;

    await ensureStaffPermissions();
    const permissions = await db.staffPermission.findMany({
      orderBy: [{ group: 'asc' }, { label: 'asc' }],
    });

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('RBAC permissions GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

