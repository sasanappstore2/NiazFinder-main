import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logModerationAudit } from '@/lib/rbac/moderation-audit';
import {
  applyModerationAction,
  getClientMeta,
  parseModerationAction,
} from '@/lib/rbac/request-moderation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:requests:moderate');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const action = parseModerationAction(body.action);
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];

    if (!action) {
      return NextResponse.json({ error: 'اقدام نامعتبر' }, { status: 400 });
    }
    if (ids.length === 0) {
      return NextResponse.json({ error: 'لیست خالی است' }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ error: 'حداکثر ۱۰۰ آیتم' }, { status: 400 });
    }

    const meta = getClientMeta(request);
    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const id of ids) {
      const result = await applyModerationAction(id, action, authz.user.id, {
        reason: typeof body.reason === 'string' ? body.reason : undefined,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      results.push({ id, ok: result.ok, error: result.ok ? undefined : result.error });
    }

    await logModerationAudit({
      actorUserId: authz.user.id,
      action: `request.moderate.bulk.${action}`,
      entityId: ids[0],
      payload: { ids, results, count: ids.length },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const successCount = results.filter((r) => r.ok).length;
    return NextResponse.json({
      message: `${successCount.toLocaleString('fa-IR')} از ${ids.length.toLocaleString('fa-IR')} انجام شد`,
      results,
      successCount,
    });
  } catch (error) {
    console.error('Super admin bulk moderate error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
