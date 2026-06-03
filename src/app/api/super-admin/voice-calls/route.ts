import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { Prisma, VoiceCallStatus } from '@prisma/client';

export const runtime = 'nodejs';

const LIST_SELECT = {
  id: true,
  callerId: true,
  calleeId: true,
  conversationId: true,
  status: true,
  startedAt: true,
  endedAt: true,
  durationSec: true,
  janusRoomId: true,
  caller: {
    select: { id: true, phone: true, displayName: true, firstName: true, lastName: true },
  },
  callee: {
    select: { id: true, phone: true, displayName: true, firstName: true, lastName: true },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'comms:voice:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q, status } = parseAdminListQuery(request);

    const where: Prisma.VoiceCallWhereInput = {};
    if (status) where.status = status as VoiceCallStatus;
    if (q) {
      where.OR = [
        { caller: { phone: { contains: q } } },
        { callee: { phone: { contains: q } } },
        { caller: { displayName: { contains: q } } },
        { callee: { displayName: { contains: q } } },
        { id: { contains: q } },
      ];
    }

    const [total, calls] = await Promise.all([
      db.voiceCall.count({ where }),
      db.voiceCall.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: LIST_SELECT,
      }),
    ]);

    return NextResponse.json({
      calls: calls.map((c) => ({
        ...c,
        startedAt: c.startedAt.toISOString(),
        endedAt: c.endedAt?.toISOString() ?? null,
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Super admin voice-calls GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
