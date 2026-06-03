import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { dispatchNeedLeadOutreach } from '@/lib/need-leads/dispatch-outreach';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:outreach:write');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';

    if (!requestId) {
      return NextResponse.json({ error: 'شناسه نیاز الزامی است' }, { status: 400 });
    }

    const result = await dispatchNeedLeadOutreach(requestId);

    await logAdminAction(request, authz.user.id, 'market.outreach.dispatch', 'ServiceRequest', requestId, {
      result,
    });

    return NextResponse.json({ message: 'dispatch اجرا شد', result });
  } catch (error) {
    console.error('Super admin outreach dispatch error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
