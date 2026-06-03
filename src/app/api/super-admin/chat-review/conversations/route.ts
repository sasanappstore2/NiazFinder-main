import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { adminPaginationMeta, parseAdminListQuery } from '@/lib/admin/list-query';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'comms:messages:read');
    if (!authz.ok) return authz.response;

    const { page, limit, skip, q } = parseAdminListQuery(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId')?.trim() || '';
    const from = searchParams.get('from')?.trim() || '';
    const to = searchParams.get('to')?.trim() || '';

    const and: Prisma.ConversationWhereInput[] = [];

    if (userId) {
      and.push({ OR: [{ userId1: userId }, { userId2: userId }] });
    }
    if (from || to) {
      and.push({
        lastMessageAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      });
    }
    if (q) {
      and.push({
        OR: [
          { lastMessage: { contains: q } },
          { user1: { phone: { contains: q } } },
          { user2: { phone: { contains: q } } },
          { user1: { displayName: { contains: q } } },
          { user2: { displayName: { contains: q } } },
        ],
      });
    }

    const where: Prisma.ConversationWhereInput = and.length > 0 ? { AND: and } : {};

    const [total, conversations] = await Promise.all([
      db.conversation.count({ where }),
      db.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          requestId: true,
          lastMessage: true,
          lastMessageAt: true,
          createdAt: true,
          user1: { select: { id: true, phone: true, displayName: true, firstName: true, lastName: true } },
          user2: { select: { id: true, phone: true, displayName: true, firstName: true, lastName: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        ...c,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        messageCount: c._count.messages,
        _count: undefined,
      })),
      pagination: adminPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Chat review conversations GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
