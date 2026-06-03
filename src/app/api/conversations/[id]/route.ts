import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

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
      content: m.content,
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
      lastMessage: conversation.lastMessage,
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

// ============ POST handler — send message ============

export async function POST(
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

    // Verify conversation exists and user is participant
    const conversation = await db.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'گفتگو مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    if (conversation.userId1 !== user.id && conversation.userId2 !== user.id) {
      return NextResponse.json(
        { error: 'شما دسترسی به این گفتگو ندارید' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, type } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'متن پیام الزامی است' },
        { status: 400 }
      );
    }

    const validTypes = ['TEXT', 'IMAGE', 'FILE', 'VOICE'];
    const messageType = validTypes.includes(type) ? type : 'TEXT';

    // Create message and update conversation in a transaction
    const message = await db.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          conversationId: id,
          senderId: user.id,
          content: content.trim(),
          type: messageType,
        },
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
      });

      // Update conversation's lastMessage and lastMessageAt
      await tx.conversation.update({
        where: { id },
        data: {
          lastMessage: content.trim().substring(0, 200),
          lastMessageAt: new Date(),
        },
      });

      return newMessage;
    });

    const result = {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      attachmentUrls: JSON.parse(message.attachmentUrls),
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    };

    return NextResponse.json(
      { message: 'پیام با موفقیت ارسال شد', data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error('Conversation detail POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
