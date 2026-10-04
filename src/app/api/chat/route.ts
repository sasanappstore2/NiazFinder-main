import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fetchLivePresence } from '@/lib/chat/live-presence';
import { resolveUserOnline } from '@/lib/chat/resolve-online';
import {
  ensurePlatformAiConversationForUser,
  isPlatformAiUserId,
} from '@/lib/platform-ai/conversation';
import { getPlatformAiUserId } from '@/lib/platform-ai/user';
import { sanitizeMessageContentForClient } from '@/lib/persian-encoding-guard';

// ============ TYPES ============

interface ConversationListItem {
  id: string;
  requestId: string | null;
  contactPointId: string | null;
  businessProfileId: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    online: boolean;
    lastSeenAt: string | null;
  };
  businessContext?: {
    businessName: string;
    contactLabel: string;
    logo: string | null;
  };
  isPlatformBot?: boolean;
  createdAt: Date;
}

interface CreateConversationBody {
  otherUserId: string;
  requestId?: string;
  contactPointId?: string;
  businessProfileId?: string;
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

    // Ensure platform bot thread exists for every authenticated user
    const platformAiUserId = await getPlatformAiUserId();
    await ensurePlatformAiConversationForUser(user.id);

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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            online: true,
            lastSeenAt: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            online: true,
            lastSeenAt: true,
          },
        },
        contactPoint: {
          include: { profile: { select: { name: true, logo: true } } },
        },
        messages: {
          where: {
            senderId: { not: user.id },
            isRead: false,
          },
          select: { id: true },
        },
        mutes: {
          where: { userId: user.id },
          select: { mutedUntil: true },
          take: 1,
        },
      },
    });

    const now = new Date();
    const mappedConversations: ConversationListItem[] = conversations.map((conv) => {
      const isUser1 = conv.userId1 === user.id;
      const otherUser = isUser1 ? conv.user2 : conv.user1;
      const isPlatformBot = isPlatformAiUserId(otherUser.id, platformAiUserId);
      const mute = conv.mutes[0];
      const isMuted =
        Boolean(mute) && (mute.mutedUntil == null || mute.mutedUntil > now);

      return {
        id: conv.id,
        requestId: conv.requestId,
        contactPointId: conv.contactPointId,
        businessProfileId: conv.businessProfileId,
        lastMessage: conv.lastMessage
          ? sanitizeMessageContentForClient(conv.lastMessage, 'TEXT')
          : conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.messages.length,
        isMuted,
        otherUser: {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          avatar: otherUser.avatar,
          online: isPlatformBot ? true : otherUser.online,
          lastSeenAt: otherUser.lastSeenAt?.toISOString() ?? null,
        },
        businessContext: conv.contactPoint
          ? {
              businessName: conv.contactPoint.profile.name,
              contactLabel: conv.contactPoint.label,
              logo: conv.contactPoint.profile.logo,
            }
          : undefined,
        isPlatformBot,
        createdAt: conv.createdAt,
      };
    });

    const sortedConversations = [...mappedConversations].sort((a, b) => {
      if (a.isPlatformBot && !b.isPlatformBot) return -1;
      if (!a.isPlatformBot && b.isPlatformBot) return 1;
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    const livePresence = await fetchLivePresence(
      sortedConversations.map((conversation) => conversation.otherUser.id)
    );
    const conversationsWithPresence = sortedConversations.map((conversation) => ({
      ...conversation,
      otherUser: {
        ...conversation.otherUser,
        online: resolveUserOnline(
          conversation.otherUser.id,
          livePresence,
          {
            online: conversation.otherUser.online,
            lastSeenAt: conversation.otherUser.lastSeenAt,
          }
        ),
      },
    }));

    return NextResponse.json({ conversations: conversationsWithPresence });
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
    const { otherUserId, requestId, contactPointId, businessProfileId } = body;

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

    let resolvedContactPointId: string | null = contactPointId ?? null;
    let resolvedBusinessProfileId: string | null = businessProfileId ?? null;
    let contactLabel: string | null = null;
    let businessName: string | null = null;

    if (contactPointId) {
      const { validateContactPointForChat } = await import(
        '@/lib/business/team/public-contacts'
      );
      const point = await validateContactPointForChat(
        contactPointId,
        otherUserId,
        businessProfileId
      );
      if (!point) {
        return NextResponse.json(
          { error: 'مخاطب انتخاب‌شده معتبر نیست' },
          { status: 400 }
        );
      }
      resolvedContactPointId = point.id;
      resolvedBusinessProfileId = point.profileId;
      contactLabel = point.label;
      businessName = point.profile.name;
    }

    const { isBlockedEitherWay } = await import('@/lib/chat/block-check');
    if (await isBlockedEitherWay(user.id, otherUserId)) {
      return NextResponse.json({ error: 'امکان گفتگو وجود ندارد' }, { status: 403 });
    }

    // Check if conversation already exists between these two users for this request + contact point
    const existingConv = await db.conversation.findFirst({
      where: {
        OR: [
          { userId1: user.id, userId2: otherUserId },
          { userId1: otherUserId, userId2: user.id },
        ],
        requestId: requestId ?? null,
        contactPointId: resolvedContactPointId,
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            online: true,
            lastSeenAt: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            online: true,
            lastSeenAt: true,
          },
        },
        contactPoint: {
          include: { profile: { select: { name: true, logo: true } } },
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
      const livePresence = await fetchLivePresence([other.id]);

      return NextResponse.json({
        message: 'این گفتگو قبلاً وجود دارد',
        conversation: {
          id: existingConv.id,
          requestId: existingConv.requestId,
          contactPointId: existingConv.contactPointId,
          businessProfileId: existingConv.businessProfileId,
          lastMessage: existingConv.lastMessage,
          lastMessageAt: existingConv.lastMessageAt,
          unreadCount: existingConv.messages.length,
          otherUser: {
            id: other.id,
            firstName: other.firstName,
            lastName: other.lastName,
            avatar: other.avatar,
            online: livePresence[other.id] ?? other.online ?? false,
            lastSeenAt: other.lastSeenAt?.toISOString() ?? null,
          },
          businessContext: existingConv.contactPoint
            ? {
                businessName: existingConv.contactPoint.profile.name,
                contactLabel: existingConv.contactPoint.label,
                logo: existingConv.contactPoint.profile.logo,
              }
            : undefined,
          createdAt: existingConv.createdAt,
        },
      });
    }

    const conversation = await db.conversation.create({
      data: {
        userId1: user.id,
        userId2: otherUserId,
        requestId: requestId || null,
        contactPointId: resolvedContactPointId,
        businessProfileId: resolvedBusinessProfileId,
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            online: true,
            lastSeenAt: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            online: true,
            lastSeenAt: true,
          },
        },
      },
    });

    if (contactLabel && businessName) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          content: `شما با بخش ${contactLabel} ${businessName} گفتگو را شروع کردید`,
          type: 'SYSTEM',
        },
      });
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: `گفتگو با ${contactLabel}`,
          lastMessageAt: new Date(),
        },
      });
    }

    const livePresence = await fetchLivePresence([otherUserId]);

    return NextResponse.json(
      {
        message: 'گفتگو با موفقیت ایجاد شد',
        conversation: {
          id: conversation.id,
          requestId: conversation.requestId,
          contactPointId: conversation.contactPointId,
          businessProfileId: conversation.businessProfileId,
          lastMessage: contactLabel ? `گفتگو با ${contactLabel}` : conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
          unreadCount: 0,
          otherUser: {
            id: otherUser.id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            avatar: null,
            online: livePresence[otherUserId] ?? false,
            lastSeenAt: null,
          },
          businessContext:
            contactLabel && businessName
              ? { businessName, contactLabel, logo: null }
              : undefined,
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
