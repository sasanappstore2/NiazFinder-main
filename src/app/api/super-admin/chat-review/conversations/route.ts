import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'comms:messages:read');
    if (!authz.ok) return authz.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) {
      where.OR = [
        { lastMessage: { contains: q } },
        { user1: { phone: { contains: q } } },
        { user2: { phone: { contains: q } } },
        { user1: { displayName: { contains: q } } },
        { user2: { displayName: { contains: q } } },
      ];
    }

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
        messageCount: c._count.messages,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Chat review conversations GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

