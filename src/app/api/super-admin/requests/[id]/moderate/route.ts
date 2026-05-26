import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import {
  applyModerationAction,
  getClientMeta,
  parseModerationAction,
} from '@/lib/rbac/request-moderation';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:requests:moderate');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = parseModerationAction(body.action);
    if (!action) {
      return NextResponse.json({ error: 'اقدام نامعتبر' }, { status: 400 });
    }

    const meta = getClientMeta(request);
    const result = await applyModerationAction(id, action, authz.user.id, {
      reason: typeof body.reason === 'string' ? body.reason : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ message: 'انجام شد', request: result.request });
  } catch (error) {
    console.error('Super admin moderate POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
