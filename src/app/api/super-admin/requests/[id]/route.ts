import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logModerationAudit } from '@/lib/rbac/moderation-audit';
import { applyAdminDeleteAction } from '@/lib/rbac/request-moderation';
import type { ModerationStatus, Priority, RequestStatus } from '@prisma/client';

export const runtime = 'nodejs';

function parseJsonField(value: string, fallback: unknown = {}) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeRequest(row: Awaited<ReturnType<typeof fetchRequestRow>>) {
  if (!row) return null;
  return {
    ...row,
    budgetMin: row.budgetMin != null ? Number(row.budgetMin) : null,
    budgetMax: row.budgetMax != null ? Number(row.budgetMax) : null,
    tags: parseJsonField(row.tags, []),
    attachmentUrls: parseJsonField(row.attachmentUrls, []),
    dynamicAnswers: parseJsonField(row.dynamicAnswers, {}),
    aiExtractedData: parseJsonField(row.aiExtractedData, {}),
    proposalCount: row._count.proposals,
    _count: undefined,
  };
}

async function fetchRequestRow(id: string) {
  return db.serviceRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          city: true,
          createdAt: true,
        },
      },
      category: { select: { id: true, name: true, slug: true, icon: true } },
      subcategory: { select: { id: true, name: true, slug: true, icon: true } },
      reviewedBy: {
        select: { id: true, displayName: true, firstName: true, lastName: true },
      },
      assignedTo: {
        select: { id: true, displayName: true, firstName: true, lastName: true },
      },
      _count: { select: { proposals: true } },
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:requests:read');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const row = await fetchRequestRow(id);

    if (!row) {
      return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ request: serializeRequest(row) });
  } catch (error) {
    console.error('Super admin request detail GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:requests:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const existing = await db.serviceRequest.findUnique({
      where: { id },
      select: { id: true, status: true, moderationStatus: true, title: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === 'string' && body.description.trim()) {
      data.description = body.description.trim();
    }
    if (body.city !== undefined) data.city = typeof body.city === 'string' ? body.city.trim() || null : null;
    if (body.province !== undefined) {
      data.province = typeof body.province === 'string' ? body.province.trim() || null : null;
    }
    if (typeof body.categoryId === 'string') data.categoryId = body.categoryId;
    if (body.subcategoryId !== undefined) {
      data.subcategoryId = typeof body.subcategoryId === 'string' ? body.subcategoryId : null;
    }
    if (body.priority && ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(body.priority)) {
      data.priority = body.priority as Priority;
    }
    if (body.status && ['PENDING_REVIEW', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(body.status)) {
      data.status = body.status as RequestStatus;
    }
    if (
      body.moderationStatus &&
      ['PENDING', 'APPROVED', 'REJECTED_SOFT', 'REJECTED_FINAL'].includes(body.moderationStatus)
    ) {
      data.moderationStatus = body.moderationStatus as ModerationStatus;
    }
    if (body.rejectionReason !== undefined) {
      data.rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() || null : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'فیلدی برای بروزرسانی ارسال نشده' }, { status: 400 });
    }

    await db.serviceRequest.update({ where: { id }, data });

    await logModerationAudit({
      actorUserId: authz.user.id,
      action: 'request.admin.patch',
      entityId: id,
      payload: {
        previousStatus: existing.status,
        previousModerationStatus: existing.moderationStatus,
        changes: data,
      },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    const row = await fetchRequestRow(id);
    return NextResponse.json({ message: 'بروزرسانی شد', request: serializeRequest(row) });
  } catch (error) {
    console.error('Super admin request PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:requests:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const meta = {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    };

    const result = await applyAdminDeleteAction(id, authz.user.id, meta);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ message: 'نیاز حذف شد', request: result.request });
  } catch (error) {
    console.error('Super admin request DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
