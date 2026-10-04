import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sanitizeMessageContentForClient } from '@/lib/persian-encoding-guard';

// ============ GET handler — conversation with messages ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            online: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            online: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'گفتگو مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Verify user is a participant
    if (conversation.userId1 !== user.id && conversation.userId2 !== user.id) {
      return NextResponse.json(
        { error: 'شما دسترسی به این گفتگو ندارید' },
        { status: 403 }
      );
    }

    // Mark unread messages as read
    const unreadMessageIds = conversation.messages
      .filter((m) => m.senderId !== user.id && !m.isRead)
      .map((m) => m.id);

    if (unreadMessageIds.length > 0) {
      await db.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { isRead: true, readAt: new Date() },
      });
    }

    const isUser1 = conversation.userId1 === user.id;
    const otherUser = isUser1 ? conversation.user2 : conversation.user1;

    const mappedMessages = conversation.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: sanitizeMessageContentForClient(m.content, m.type),
      type: m.type,
      attachmentUrls: JSON.parse(m.attachmentUrls),
      isRead: m.isRead,
      readAt: m.readAt?.toISOString() || null,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender,
    }));

    const result = {
      id: conversation.id,
      requestId: conversation.requestId,
      userId1: conversation.userId1,
      userId2: conversation.userId2,
      lastMessage: conversation.lastMessage
        ? sanitizeMessageContentForClient(conversation.lastMessage, 'TEXT')
        : conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      otherUser,
      messages: mappedMessages,
    };

    return NextResponse.json({ conversation: result });
  } catch (error) {
    console.error('Conversation detail GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ POST — hard-deprecated (no fanout). Use /api/chat/[id] ═══════

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(
    {
      error:
        'این مسیر منسوخ شده است. برای ارسال پیام از POST /api/chat/[conversationId] استفاده کنید.',
      successor: `/api/chat/${id}`,
    },
    {
      status: 410,
      headers: {
        Deprecation: 'true',
        Link: `</api/chat/${id}>; rel="successor-version"`,
      },
    }
  );
}
