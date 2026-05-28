import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { buildIntakeAiEvaluationDashboard } from '@/ai/evaluation/dashboardData';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-migration:read');
    if (!authz.ok) return authz.response;

    const data = await buildIntakeAiEvaluationDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error('intake-ai-evaluation dashboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
