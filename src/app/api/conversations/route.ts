import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/** @deprecated Use `/api/chat` instead. */
const DEPRECATION_HEADERS = {
  Deprecation: 'true',
  Link: '</api/chat>; rel="successor-version"',
};

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
          where: { isRead: false, senderId: { not: user.id } },
          select: { id: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const result: ConversationListItem[] = conversations.map((conv) => {
      const isUser1 = conv.userId1 === user.id;
      const other = isUser1 ? conv.user2 : conv.user1;
      return {
        id: conv.id,
        requestId: conv.requestId,
        userId1: conv.userId1,
        userId2: conv.userId2,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt?.toISOString() || null,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        otherUser: other,
        unreadCount: conv.messages.length,
      };
    });

    return NextResponse.json(
      { conversations: result },
      { headers: DEPRECATION_HEADERS }
    );
  } catch (error) {
    console.error('Conversations GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

/** POST — hard-deprecated. Use POST /api/chat */
export async function POST() {
  return NextResponse.json(
    {
      error: 'این مسیر منسوخ شده است. برای ساخت گفتگو از POST /api/chat استفاده کنید.',
      successor: '/api/chat',
    },
    {
      status: 410,
      headers: DEPRECATION_HEADERS,
    }
  );
}
