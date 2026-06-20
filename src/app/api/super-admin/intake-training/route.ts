import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { buildIntakeTrainingDashboardData } from '@/intake/training/dashboardData';

export const runtime = 'nodejs';

function parseBool(v: string | null): boolean | undefined {
  if (v == null || v === '') return undefined;
  return v === 'true' || v === '1';
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-training:read');
    if (!authz.ok) return authz.response;

    const sp = request.nextUrl.searchParams;
    const data = await buildIntakeTrainingDashboardData({
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 25,
      reviewed: parseBool(sp.get('reviewed')),
      hasUserCorrections: parseBool(sp.get('hasUserCorrections')),
      needType: sp.get('needType') ?? undefined,
      qualityFlag: sp.get('qualityFlag') ?? undefined,
      search: sp.get('search') ?? undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('intake-training list error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
