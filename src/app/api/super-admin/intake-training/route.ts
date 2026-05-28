import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { buildIntakeTrainingDashboard } from '@/intake/training/dashboardData';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-training:read');
    if (!authz.ok) return authz.response;

    const data = await buildIntakeTrainingDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error('intake-training dashboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
