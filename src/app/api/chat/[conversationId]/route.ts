import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, type PaginatedResponse } from '@/lib/auth';
import { needCardSnapshotSchema } from '@/contracts/need-card-snapshot';

// ============ TYPES ============

interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  type: string;
  attachmentUrls: string[];
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

const VALID_MESSAGE_TYPES = ['TEXT', 'IMAGE', 'FILE', 'VOICE', 'NEED_CARD'] as const;
type ValidMessageType = (typeof VALID_MESSAGE_TYPES)[number];

interface SendMessageBody {
  content: string;
  type?: ValidMessageType;
}

// ============ GET handler ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'شناسه گفتگو الزامی است' },
        { status: 400 }
      );
    }

    // Check conversation exists and user is a participant
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      db.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.message.count({ where: { conversationId } }),
    ]);

    // Reverse to get chronological order (oldest first)
    const orderedMessages = messages.reverse();

    const mappedMessages: MessageItem[] = orderedMessages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      type: m.type,
      attachmentUrls: JSON.parse(m.attachmentUrls) as string[],
      isRead: m.isRead,
      readAt: m.readAt,
      createdAt: m.createdAt,
    }));

    const response: PaginatedResponse<MessageItem> = {
      data: mappedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat messages GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ POST handler ============

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'شناسه گفتگو الزامی است' },
        { status: 400 }
      );
    }

    // Check conversation exists and user is a participant
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
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

    const body: SendMessageBody = await request.json();
    const { content, type } = body;

    const messageType = (type ?? 'TEXT') as ValidMessageType;
    if (!VALID_MESSAGE_TYPES.includes(messageType)) {
      return NextResponse.json({ error: 'نوع پیام نامعتبر است' }, { status: 400 });
    }

    if (messageType === 'NEED_CARD') {
      try {
        const parsed = needCardSnapshotSchema.safeParse(JSON.parse(content));
        if (!parsed.success) {
          return NextResponse.json({ error: 'فرمت کارت نیاز نامعتبر است' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'فرمت کارت نیاز نامعتبر است' }, { status: 400 });
      }
    } else if (!content?.trim()) {
      return NextResponse.json(
        { error: 'محتوای پیام الزامی است' },
        { status: 400 }
      );
    }

    const lastPreview =
      messageType === 'NEED_CARD'
        ? (() => {
            try {
              const p = JSON.parse(content) as { title?: string };
              return p.title ? `نیاز: ${p.title}` : 'نیاز جدید';
            } catch {
              return 'نیاز جدید';
            }
          })()
        : content.trim();

    // Determine the other user in this conversation
    const otherUserId = conversation.userId1 === user.id
      ? conversation.userId2
      : conversation.userId1;

    // Create message and update conversation in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the message
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId: user.id,
          content: messageType === 'NEED_CARD' ? content : content.trim(),
          type: messageType,
          isRead: false,
        },
      });

      // Update conversation's last message info
      const updatedConv = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: lastPreview,
          lastMessageAt: new Date(),
        },
      });

      // Mark messages from other user as read
      await tx.message.updateMany({
        where: {
          conversationId,
          senderId: otherUserId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return { message, updatedConv };
    });

    const mappedMessage: MessageItem = {
      id: result.message.id,
      senderId: result.message.senderId,
      content: result.message.content,
      type: result.message.type,
      attachmentUrls: [],
      isRead: result.message.isRead,
      readAt: result.message.readAt,
      createdAt: result.message.createdAt,
    };

    return NextResponse.json(
      {
        message: 'پیام با موفقیت ارسال شد',
        messageData: mappedMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Chat messages POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
