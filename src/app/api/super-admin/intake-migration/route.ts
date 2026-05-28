import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { buildIntakeMigrationDashboard } from '@/intake/migration/dashboard-data';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-migration:read');
    if (!authz.ok) return authz.response;

    const data = await buildIntakeMigrationDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error('intake-migration dashboard error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
