import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { buildIntakeGovernanceDashboard } from '@/lib/intake/governance-dashboard';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-migration:read');
    if (!authz.ok) {
      const fallback = await requirePermission(request, 'rbac:roles:read');
      if (!fallback.ok) return fallback.response;
    }

    const data = await buildIntakeGovernanceDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error('intake-governance GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
