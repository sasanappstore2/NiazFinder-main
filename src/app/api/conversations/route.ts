import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';

const CONVERSATION_POST_RATE_WINDOW_MS = 60_000;
const CONVERSATION_POST_RATE_MAX = 20;
const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

function isValidUserId(value: unknown): value is string {
  return typeof value === 'string' && CUID_PATTERN.test(value.trim());
}

/** @deprecated Use `/api/chat` instead. */
const DEPRECATION_HEADERS = {
  Deprecation: 'true',
  Link: '</api/chat>; rel="successor-version"',
};

// ============ TYPES ============

interface ConversationListItem {
  id: string;
  requestId: string | null;
  userId1: string;
  userId2: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatar: string | null;
    online: boolean;
  };
  unreadCount: number;
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

    const conversations = await db.conversation.findMany({
      where: {
        OR: [{ userId1: user.id }, { userId2: user.id }],
      },
      orderBy: { lastMessageAt: 'desc' },
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
          select: {
            id: true,
            isRead: true,
            senderId: true,
          },
        },
      },
    });

    const mappedConversations: ConversationListItem[] = conversations.map((conv) => {
      const isUser1 = conv.userId1 === user.id;
      const otherUser = isUser1 ? conv.user2 : conv.user1;

      // Count unread messages (messages not sent by current user and not read)
      const unreadCount = conv.messages.filter(
        (m) => m.senderId !== user.id && !m.isRead
      ).length;

      return {
        id: conv.id,
        requestId: conv.requestId,
        userId1: conv.userId1,
        userId2: conv.userId2,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt?.toISOString() || null,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        otherUser,
        unreadCount,
      };
    });

    return NextResponse.json({ conversations: mappedConversations }, { headers: DEPRECATION_HEADERS });
  } catch (error) {
    console.error('Conversations GET error:', error);
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

    const body = await request.json();
    const { otherUserId, requestId } = body;

    const rate = checkRateLimit(
      `conversations:post:${user.id}:${clientIp(request)}`,
      CONVERSATION_POST_RATE_MAX,
      CONVERSATION_POST_RATE_WINDOW_MS
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌ها بیش از حد مجاز است' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec ?? 60) } }
      );
    }

    if (!isValidUserId(otherUserId)) {
      return NextResponse.json(
        { error: 'شناسه کاربر مقابل معتبر نیست' },
        { status: 400 }
      );
    }

    if (otherUserId === user.id) {
      return NextResponse.json(
        { error: 'شما نمی‌توانید با خودتان گفتگو ایجاد کنید' },
        { status: 400 }
      );
    }

    // Check other user exists
    const otherUser = await db.user.findUnique({
      where: { id: otherUserId },
    });

    if (!otherUser) {
      return NextResponse.json(
        { error: 'کاربر مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Check if conversation already exists between the two users
    const existingConversation = await db.conversation.findFirst({
      where: {
        OR: [
          { userId1: user.id, userId2: otherUserId },
          { userId1: otherUserId, userId2: user.id },
        ],
      },
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
      },
    });

    if (existingConversation) {
      const isUser1 = existingConversation.userId1 === user.id;
      const other = isUser1 ? existingConversation.user2 : existingConversation.user1;

      return NextResponse.json({
        conversation: {
          id: existingConversation.id,
          requestId: existingConversation.requestId,
          userId1: existingConversation.userId1,
          userId2: existingConversation.userId2,
          lastMessage: existingConversation.lastMessage,
          lastMessageAt: existingConversation.lastMessageAt?.toISOString() || null,
          createdAt: existingConversation.createdAt.toISOString(),
          updatedAt: existingConversation.updatedAt.toISOString(),
          otherUser: other,
          unreadCount: 0,
        },
      });
    }

    // Validate requestId if provided
    if (requestId) {
      const serviceRequest = await db.serviceRequest.findUnique({
        where: { id: requestId },
      });
      if (!serviceRequest) {
        return NextResponse.json(
          { error: 'نیاز مورد نظر یافت نشد' },
          { status: 404 }
        );
      }
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
      },
    });

    const isUser1 = conversation.userId1 === user.id;
    const other = isUser1 ? conversation.user2 : conversation.user1;

    const result = {
      id: conversation.id,
      requestId: conversation.requestId,
      userId1: conversation.userId1,
      userId2: conversation.userId2,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      otherUser: other,
      unreadCount: 0,
    };

    return NextResponse.json(
      { message: 'گفتگو با موفقیت ایجاد شد', conversation: result },
      { status: 201 }
    );
  } catch (error) {
    console.error('Conversations POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
