import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string, query: { page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
        },
        user2: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
        },
        messages: {
          where: { isRead: false, senderId: { not: userId } },
          select: { id: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.conversation.count({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
      },
    });

    const result = conversations.map((conv) => {
      const isUser1 = conv.userId1 === userId;
      const otherUser = isUser1 ? conv.user1 : conv.user2;
      const unreadCount = conv.messages.length;

      return {
        id: conv.id,
        requestId: conv.requestId,
        otherUser: {
          id: otherUser.id,
          displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`,
          avatar: otherUser.avatar,
          online: otherUser.online,
          lastSeenAt: otherUser.lastSeenAt,
        },
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        createdAt: conv.createdAt,
      };
    });

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createOrGetConversation(userId1: string, userId2: string, requestId?: string) {
    if (userId1 === userId2) {
      throw new BadRequestException('نمی‌توانید با خودتان مکالمه ایجاد کنید');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId2 },
      select: { id: true, isActive: true, isBanned: true },
    });

    if (!targetUser) {
      throw new NotFoundException('کاربر مورد نظر یافت نشد');
    }

    if (!targetUser.isActive || targetUser.isBanned) {
      throw new BadRequestException('کاربر مورد نظر در دسترس نیست');
    }

    if (requestId) {
      const request = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { id: true },
      });
      if (!request) {
        throw new NotFoundException('درخواست مورد نظر یافت نشد');
      }
    }

    // Try to find existing conversation (check both directions)
    const existing = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1, userId2, requestId: requestId || null },
          { userId1: userId2, userId2: userId1, requestId: requestId || null },
        ],
      },
      include: {
        user1: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
        },
        user2: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
        },
      },
    });

    if (existing) {
      const isUser1 = existing.userId1 === userId1;
      const otherUser = isUser1 ? existing.user2 : existing.user1;

      return {
        id: existing.id,
        requestId: existing.requestId,
        otherUser: {
          id: otherUser.id,
          displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`,
          avatar: otherUser.avatar,
          online: otherUser.online,
          lastSeenAt: otherUser.lastSeenAt,
        },
        lastMessage: existing.lastMessage,
        lastMessageAt: existing.lastMessageAt,
        createdAt: existing.createdAt,
      };
    }

    // Create new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        userId1,
        userId2,
        requestId: requestId || null,
        lastMessage: 'مکالمه شروع شد',
        lastMessageAt: new Date(),
        messages: {
          create: {
            senderId: 'SYSTEM',
            content: 'مکالمه شروع شد',
            type: 'SYSTEM',
            isRead: true,
            readAt: new Date(),
          },
        },
      },
      include: {
        user1: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
        },
        user2: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
        },
      },
    });

    const isUser1 = conversation.userId1 === userId1;
    const otherUser = isUser1 ? conversation.user2 : conversation.user1;

    return {
      id: conversation.id,
      requestId: conversation.requestId,
      otherUser: {
        id: otherUser.id,
        displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`,
        avatar: otherUser.avatar,
        online: otherUser.online,
        lastSeenAt: otherUser.lastSeenAt,
      },
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    };
  }

  async getMessages(conversationId: string, userId: string, query: { page?: number; limit?: number }) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      throw new NotFoundException('مکالمه یافت نشد');
    }

    if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
      throw new ForbiddenException('شما دسترسی به این مکالمه را ندارید');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 30;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: { conversationId },
      }),
    ]);

    return {
      data: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        attachmentUrls: msg.attachmentUrls,
        isRead: msg.isRead,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
        sender: msg.senderId === 'SYSTEM'
          ? null
          : {
              id: msg.sender.id,
              displayName: msg.sender.displayName || `${msg.sender.firstName} ${msg.sender.lastName}`,
              avatar: msg.sender.avatar,
            },
        isMine: msg.senderId === userId,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      throw new NotFoundException('مکالمه یافت نشد');
    }

    if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
      throw new ForbiddenException('شما دسترسی به این مکالمه را ندارید');
    }

    const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content,
        type: dto.type || 'TEXT',
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
        },
      },
    });

    // Update conversation lastMessage and lastMessageAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: dto.content,
        lastMessageAt: new Date(),
      },
    });

    // Create notification for the other user
    await this.prisma.notification.create({
      data: {
        userId: otherUserId,
        type: 'NEW_MESSAGE',
        title: 'پیام جدید',
        message: 'شما یک پیام جدید دریافت کردید',
        data: JSON.stringify({
          conversationId,
          messageId: message.id,
          senderId: userId,
        }),
      },
    });

    return {
      id: message.id,
      content: message.content,
      type: message.type,
      attachmentUrls: message.attachmentUrls,
      isRead: message.isRead,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        displayName: message.sender.displayName || `${message.sender.firstName} ${message.sender.lastName}`,
        avatar: message.sender.avatar,
      },
      isMine: true,
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      throw new NotFoundException('مکالمه یافت نشد');
    }

    if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
      throw new ForbiddenException('شما دسترسی به این مکالمه را ندارید');
    }

    const now = new Date();
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return {
      count: result.count,
      message: `${result.count} پیام به عنوان خوانده شده علامت‌گذاری شد`,
    };
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      throw new NotFoundException('مکالمه یافت نشد');
    }

    if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
      throw new ForbiddenException('شما دسترسی به این مکالمه را ندارید');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return {
      message: 'مکالمه با موفقیت حذف شد',
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        conversation: {
          OR: [{ userId1: userId }, { userId2: userId }],
        },
        isRead: false,
        senderId: { not: userId },
      },
    });

    return {
      count,
    };
  }
}
