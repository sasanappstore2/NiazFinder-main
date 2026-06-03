import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import type { ReportStatus } from '@prisma/client';

export const runtime = 'nodejs';

const VALID_STATUSES: ReportStatus[] = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'content:reports:moderate');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === 'string' ? (body.status as ReportStatus) : null;
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
    }

    const existing = await db.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'گزارش یافت نشد' }, { status: 404 });
    }

    const isTerminal = status === 'RESOLVED' || status === 'DISMISSED';
    const description =
      note && isTerminal
        ? [existing.description, `[یادداشت ادمین] ${note}`].filter(Boolean).join('\n')
        : existing.description;

    const report = await db.report.update({
      where: { id },
      data: {
        status,
        description,
        resolvedBy: isTerminal ? authz.user.id : existing.resolvedBy,
        resolvedAt: isTerminal ? new Date() : status === 'REVIEWING' ? null : existing.resolvedAt,
      },
    });

    await logAdminAction(request, authz.user.id, 'content.report.update', 'Report', id, {
      status,
      note: note || undefined,
    });

    return NextResponse.json({
      report: {
        ...report,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
        resolvedAt: report.resolvedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Super admin report PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
