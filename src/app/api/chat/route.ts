import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ============ TYPES ============

interface ConversationListItem {
  id: string;
  requestId: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    online: boolean;
  };
  createdAt: Date;
}

interface CreateConversationBody {
  otherUserId: string;
  requestId?: string;
}

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    // Find all conversations where the current user is a participant
    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { userId1: user.id },
          { userId2: user.id },
        ],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user1: {
          select: { id: true, firstName: true, lastName: true, avatar: true, online: true },
        },
        user2: {
          select: { id: true, firstName: true, lastName: true, avatar: true, online: true },
        },
        messages: {
          where: {
            senderId: { not: user.id },
            isRead: false,
          },
          select: { id: true },
        },
      },
    });

    const mappedConversations: ConversationListItem[] = conversations.map((conv) => {
      const isUser1 = conv.userId1 === user.id;
      const otherUser = isUser1 ? conv.user2 : conv.user1;

      return {
        id: conv.id,
        requestId: conv.requestId,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.messages.length,
        otherUser: {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          avatar: otherUser.avatar,
          online: otherUser.online,
        },
        createdAt: conv.createdAt,
      };
    });

    return NextResponse.json({ conversations: mappedConversations });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ POST handler ============

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const body: CreateConversationBody = await request.json();
    const { otherUserId, requestId } = body;

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'شناسه کاربر مقابل الزامی است' },
        { status: 400 }
      );
    }

    // Cannot create conversation with yourself
    if (otherUserId === user.id) {
      return NextResponse.json(
        { error: 'شما نمی‌توانید با خودتان گفتگو ایجاد کنید' },
        { status: 400 }
      );
    }

    // Check if other user exists
    const otherUser = await db.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!otherUser) {
      return NextResponse.json(
        { error: 'کاربر مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Check if conversation already exists between these two users for this request
    const existingConv = await db.conversation.findFirst({
      where: {
        OR: [
          { userId1: user.id, userId2: otherUserId },
          { userId1: otherUserId, userId2: user.id },
        ],
        ...(requestId ? { requestId } : {}),
      },
      include: {
        user1: {
          select: { id: true, firstName: true, lastName: true, avatar: true, online: true },
        },
        user2: {
          select: { id: true, firstName: true, lastName: true, avatar: true, online: true },
        },
        messages: {
          where: {
            senderId: { not: user.id },
            isRead: false,
          },
          select: { id: true },
        },
      },
    });

    if (existingConv) {
      const isUser1 = existingConv.userId1 === user.id;
      const other = isUser1 ? existingConv.user2 : existingConv.user1;

      return NextResponse.json({
        message: 'این گفتگو قبلاً وجود دارد',
        conversation: {
          id: existingConv.id,
          requestId: existingConv.requestId,
          lastMessage: existingConv.lastMessage,
          lastMessageAt: existingConv.lastMessageAt,
          unreadCount: existingConv.messages.length,
          otherUser: {
            id: other.id,
            firstName: other.firstName,
            lastName: other.lastName,
            avatar: other.avatar,
            online: other.online,
          },
          createdAt: existingConv.createdAt,
        },
      });
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        userId1: user.id,
        userId2: otherUserId,
        requestId: requestId || null,
      },
      include: {
        user1: {
          select: { id: true, firstName: true, lastName: true, avatar: true, online: true },
        },
        user2: {
          select: { id: true, firstName: true, lastName: true, avatar: true, online: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'گفتگو با موفقیت ایجاد شد',
        conversation: {
          id: conversation.id,
          requestId: conversation.requestId,
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
          unreadCount: 0,
          otherUser: {
            id: otherUser.id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            avatar: null,
            online: false,
          },
          createdAt: conversation.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
