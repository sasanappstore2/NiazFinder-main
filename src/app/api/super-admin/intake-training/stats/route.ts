import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { buildTrainingStats } from '@/intake/training/trainingRepository';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-training:read');
    if (!authz.ok) return authz.response;

    const stats = await buildTrainingStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('intake-training stats error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
