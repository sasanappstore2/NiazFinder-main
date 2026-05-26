import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { applyUnpublishAction, getClientMeta } from '@/lib/rbac/request-moderation';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:requests:moderate');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const meta = getClientMeta(request);
    const result = await applyUnpublishAction(id, authz.user.id, meta);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ message: 'آگهی از انتشار خارج شد', request: result.request });
  } catch (error) {
    console.error('Super admin unpublish POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
