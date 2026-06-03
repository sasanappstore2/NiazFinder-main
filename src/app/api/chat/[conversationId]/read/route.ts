import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { publishCommEvent } from '@/lib/communication/redis-publish';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (conversation.userId1 !== user.id && conversation.userId2 !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await db.message.updateMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    if (result.count > 0) {
      const otherUserId =
        conversation.userId1 === user.id ? conversation.userId2 : conversation.userId1;

      void publishCommEvent({
        type: 'message:read-receipt',
        payload: {
          conversationId,
          readerId: user.id,
          notifyUserId: otherUserId,
          count: result.count,
          timestamp: new Date().toISOString(),
        },
      });

      void publishCommEvent({
        type: 'conversation:unread-update',
        payload: {
          conversationId,
          unreadCount: 0,
        },
      });
    }

    return NextResponse.json({ ok: true, marked: result.count });
  } catch (error) {
    console.error('[chat read] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
