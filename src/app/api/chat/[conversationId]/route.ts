import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, type PaginatedResponse } from '@/lib/auth';
import { needCardSnapshotSchema } from '@/contracts/need-card-snapshot';
import { productCardSnapshotSchema } from '@/contracts/product-card-snapshot';
import { parseChatContactShareContent } from '@/lib/chat/contact-share';
import { publishMessageNew } from '@/lib/communication/redis-publish';
import { enqueueMessagePushNotification } from '@/lib/communication/push-hook';
import { isBlockedEitherWay } from '@/lib/chat/block-check';
import {
  createChatMessage,
  findMessageByClientTempId,
} from '@/lib/chat/prisma-message';
import { mapDbMessageToClient, type DbMessageRow } from '@/lib/chat/message-map';
import type { Message } from '@/lib/types';

// ============ TYPES ============

type MessageItem = Message & { readAt?: Date | null };

const VALID_MESSAGE_TYPES = ['TEXT', 'IMAGE', 'FILE', 'VOICE', 'NEED_CARD', 'OFFER_CARD'] as const;
type ValidMessageType = (typeof VALID_MESSAGE_TYPES)[number];

interface SendMessageBody {
  content: string;
  type?: ValidMessageType;
  clientTempId?: string;
  replyToId?: string;
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
        include: {
          replyTo: {
            select: {
              id: true,
              content: true,
              type: true,
              deletedAt: true,
              sender: { select: { firstName: true, lastName: true } },
            },
          },
          reactions: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, avatar: true },
              },
            },
          },
        },
      }),
      db.message.count({ where: { conversationId } }),
    ]);

    const orderedMessages = messages.reverse();

    const mappedMessages: MessageItem[] = [];
    for (const m of orderedMessages) {
      const mapped = mapDbMessageToClient(m as DbMessageRow, conversationId, user.id);
      if (mapped) {
        mappedMessages.push({ ...mapped, readAt: m.readAt });
      }
    }

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

    const otherUserId =
      conversation.userId1 === user.id ? conversation.userId2 : conversation.userId1;
    if (await isBlockedEitherWay(user.id, otherUserId)) {
      return NextResponse.json({ error: 'امکان ارسال پیام وجود ندارد' }, { status: 403 });
    }

    const body: SendMessageBody = await request.json();
    const { content, type, clientTempId, replyToId } = body;

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
    } else if (messageType === 'OFFER_CARD') {
      try {
        const parsed = productCardSnapshotSchema.safeParse(JSON.parse(content));
        if (!parsed.success) {
          return NextResponse.json({ error: 'فرمت کارت محصول نامعتبر است' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'فرمت کارت محصول نامعتبر است' }, { status: 400 });
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
        : messageType === 'OFFER_CARD'
          ? (() => {
              try {
                const p = JSON.parse(content) as { title?: string };
                return p.title ? `محصول: ${p.title}` : 'محصول';
              } catch {
                return 'محصول';
              }
            })()
          : messageType === 'VOICE'
          ? 'پیام صوتی'
          : parseChatContactShareContent(content)
            ? 'شمارهٔ تماس'
            : content.trim();

    if (clientTempId) {
      const existing = await findMessageByClientTempId(db, {
        conversationId,
        clientTempId,
        senderId: user.id,
      });
      if (existing) {
        const mappedExisting: MessageItem = {
          id: existing.id,
          conversationId,
          senderId: existing.senderId,
          content: existing.content,
          type: existing.type,
          attachmentUrls: JSON.parse(existing.attachmentUrls) as string[],
          isRead: existing.isRead,
          readAt: existing.readAt,
          createdAt: existing.createdAt.toISOString(),
        };
        return NextResponse.json(
          { message: 'پیام قبلاً ثبت شده', messageData: mappedExisting },
          { status: 200 }
        );
      }
    }

    let replyToMeta:
      | { id: string; content: string; senderFirstName: string; senderLastName: string }
      | undefined;
    if (replyToId) {
      const replied = await db.message.findFirst({
        where: { id: replyToId, conversationId },
        include: { sender: { select: { firstName: true, lastName: true } } },
      });
      if (replied) {
        replyToMeta = {
          id: replied.id,
          content: replied.content.slice(0, 200),
          senderFirstName: replied.sender.firstName,
          senderLastName: replied.sender.lastName,
        };
      }
    }

    // Create message and update conversation in a transaction
    const trimmedContent =
      messageType === 'NEED_CARD' || messageType === 'OFFER_CARD'
        ? content
        : content.trim();

    const result = await db.$transaction(async (tx) => {
      const message = await createChatMessage(tx, {
        conversationId,
        senderId: user.id,
        content: trimmedContent,
        type: messageType,
        clientTempId,
        replyToId: replyToMeta?.id,
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

    const attachmentUrls = JSON.parse(result.message.attachmentUrls) as string[];

    const mappedMessage: MessageItem = {
      id: result.message.id,
      conversationId,
      senderId: result.message.senderId,
      content: result.message.content,
      type: result.message.type,
      attachmentUrls,
      isRead: result.message.isRead,
      readAt: result.message.readAt,
      createdAt: result.message.createdAt.toISOString(),
      replyToId: replyToMeta?.id,
      replyTo: replyToMeta,
    };

    const fanoutPayload = {
      id: result.message.id,
      conversationId,
      senderId: result.message.senderId,
      content: result.message.content,
      type: result.message.type,
      attachmentUrls,
      isRead: false,
      createdAt: result.message.createdAt.toISOString(),
      clientTempId,
      replyToId: replyToMeta?.id,
      replyTo: replyToMeta,
    };

    void publishMessageNew(fanoutPayload);
    void enqueueMessagePushNotification(otherUserId, fanoutPayload);

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
