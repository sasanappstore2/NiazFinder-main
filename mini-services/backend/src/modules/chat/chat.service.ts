import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import Redis from 'ioredis';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private redisPublisher: Redis | null = null;

  constructor(private prisma: PrismaService) {
    this.initRedis();
  }

  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisPublisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      await this.redisPublisher.connect();
      this.logger.log('✅ ChatService Redis publisher connected');
    } catch (error) {
      this.logger.warn(`⚠️ ChatService Redis not available: ${error instanceof Error ? error.message : error}`);
      this.redisPublisher = null;
    }
  }

  private async publishToRedis(channel: string, data: any) {
    if (this.redisPublisher) {
      try {
        await this.redisPublisher.publish(channel, JSON.stringify(data));
      } catch (error) {
        this.logger.error(`Failed to publish to Redis channel ${channel}: ${error}`);
      }
    }
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  async getConversations(userId: string, query: QueryConversationsDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
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
      const otherUser = isUser1 ? conv.user2 : conv.user1;
      const unreadCount = conv.messages.length;

      return {
        id: conv.id,
        requestId: conv.requestId,
        otherUser: {
          id: otherUser.id,
          displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
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

  async createConversation(userId: string, dto: CreateConversationDto) {
    const otherUserId = dto.otherUserId || dto.userId2;

    if (!otherUserId) {
      throw new BadRequestException('شناسه کاربر مقابل الزامی است');
    }

    if (userId === otherUserId) {
      throw new BadRequestException('نمی‌توانید با خودتان مکالمه ایجاد کنید');
    }

    // Check if user is blocked by the other user
    const existingBlock = await this.prisma.message.count({
      where: {
        conversation: {
          OR: [
            { userId1: userId, userId2: otherUserId },
            { userId1: otherUserId, userId2: userId },
          ],
        },
        type: 'SYSTEM_BLOCKED',
      },
    });

    if (existingBlock > 0) {
      throw new ForbiddenException('شما نمی‌توانید با این کاربر مکالمه ایجاد کنید');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, isActive: true, isBanned: true },
    });

    if (!targetUser) {
      throw new NotFoundException('کاربر مورد نظر یافت نشد');
    }

    if (!targetUser.isActive || targetUser.isBanned) {
      throw new BadRequestException('کاربر مورد نظر در دسترس نیست');
    }

    const requestId = dto.requestId;
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
          { userId1: userId, userId2: otherUserId, requestId: requestId || null },
          { userId1: otherUserId, userId2: userId, requestId: requestId || null },
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
      const isUser1 = existing.userId1 === userId;
      const otherUser = isUser1 ? existing.user2 : existing.user1;

      return {
        id: existing.id,
        requestId: existing.requestId,
        otherUser: {
          id: otherUser.id,
          displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
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
        userId1: userId,
        userId2: otherUserId,
        requestId: requestId || null,
        lastMessage: 'مکالمه شروع شد',
        lastMessageAt: new Date(),
        messages: {
          create: {
            senderId: 'SYSTEM',
            content: requestId ? 'مکالمه در خصوص درخواست خدمات شروع شد' : 'مکالمه شروع شد',
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

    const isUser1 = conversation.userId1 === userId;
    const otherUser = isUser1 ? conversation.user2 : conversation.user1;

    return {
      id: conversation.id,
      requestId: conversation.requestId,
      otherUser: {
        id: otherUser.id,
        displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
        avatar: otherUser.avatar,
        online: otherUser.online,
        lastSeenAt: otherUser.lastSeenAt,
      },
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Backward-compatible alias for createConversation (used by controller).
   */
  async createOrGetConversation(userId: string, userId2: string, requestId?: string) {
    return this.createConversation(userId, { userId2, requestId });
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  async getMessages(conversationId: string, userId: string, query: QueryMessagesDto) {
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

    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;

    const whereClause: any = { conversationId };

    // Cursor-based pagination: before date
    if (query.before) {
      const beforeDate = new Date(query.before);
      if (!isNaN(beforeDate.getTime())) {
        whereClause.createdAt = { lt: beforeDate };
      }
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: whereClause,
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

    // Auto mark as read
    const now = new Date();
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true, readAt: now },
    });

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
              displayName: msg.sender.displayName || `${msg.sender.firstName} ${msg.sender.lastName}`.trim(),
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

    // Validate content
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('محتوای پیام نمی‌تواند خالی باشد');
    }

    if (dto.content.length > 10000) {
      throw new BadRequestException('محتوای پیام حداکثر ۱۰,۰۰۰ کاراکتر می‌تواند باشد');
    }

    const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;

    // Build attachment data
    const attachmentUrls = dto.fileUrl ? JSON.stringify([dto.fileUrl]) : '[]';

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content.trim(),
        type: dto.type || 'TEXT',
        attachmentUrls,
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
        lastMessage: dto.content.trim().substring(0, 200),
        lastMessageAt: new Date(),
      },
    });

    // Create notification for the other user
    await this.prisma.notification.create({
      data: {
        userId: otherUserId,
        type: 'NEW_MESSAGE',
        title: 'پیام جدید',
        message: dto.content.trim().substring(0, 100),
        data: JSON.stringify({
          conversationId,
          messageId: message.id,
          senderId: userId,
        }),
      },
    });

    // Publish to Redis
    await this.publishToRedis('chat:messages', {
      conversationId,
      senderId: userId,
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        attachmentUrls: message.attachmentUrls,
        isRead: message.isRead,
        createdAt: message.createdAt,
        sender: {
          id: message.sender.id,
          displayName: message.sender.displayName || `${message.sender.firstName} ${message.sender.lastName}`.trim(),
          avatar: message.sender.avatar,
        },
        isMine: true,
      },
    });

    await this.publishToRedis('notifications', {
      userId: otherUserId,
      notification: {
        type: 'NEW_MESSAGE',
        conversationId,
        senderId: userId,
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
        displayName: message.sender.displayName || `${message.sender.firstName} ${message.sender.lastName}`.trim(),
        avatar: message.sender.avatar,
      },
      isMine: true,
    };
  }

  // ─── Read Receipts ────────────────────────────────────────────────────────

  async markAsRead(conversationId: string, userId: string, messageIds?: string[]) {
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

    let result;
    if (messageIds && messageIds.length > 0) {
      result = await this.prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          conversationId,
          senderId: { not: userId },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: now,
        },
      });
    } else {
      result = await this.prisma.message.updateMany({
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
    }

    return {
      count: result.count,
      message: `${result.count} پیام به عنوان خوانده شده علامت‌گذاری شد`,
    };
  }

  // ─── Message Management ───────────────────────────────────────────────────

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true, type: true },
    });

    if (!message) {
      throw new NotFoundException('پیام یافت نشد');
    }

    // Only allow deleting own messages (or system messages by admins, but not SYSTEM type)
    if (message.senderId !== userId) {
      throw new ForbiddenException('فقط پیام‌های خودتان را می‌توانید حذف کنید');
    }

    if (message.type === 'SYSTEM') {
      throw new BadRequestException('پیام‌های سیستمی قابل حذف نیستند');
    }

    // Soft delete: replace content with deleted marker
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: 'پیام حذف شده',
        type: 'DELETED',
      },
    });

    return {
      message: 'پیام با موفقیت حذف شد',
    };
  }

  async searchMessages(conversationId: string, userId: string, queryStr: string) {
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

    if (!queryStr || queryStr.trim().length === 0) {
      throw new BadRequestException('عبارت جستجو نمی‌تواند خالی باشد');
    }

    // SQLite search with LIKE
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        content: { contains: queryStr.trim() },
        type: { notIn: ['SYSTEM', 'DELETED'] },
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      data: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        createdAt: msg.createdAt,
        sender: msg.senderId === 'SYSTEM'
          ? null
          : {
              id: msg.sender.id,
              displayName: msg.sender.displayName || `${msg.sender.firstName} ${msg.sender.lastName}`.trim(),
              avatar: msg.sender.avatar,
            },
        isMine: msg.senderId === userId,
      })),
      query: queryStr,
      count: messages.length,
    };
  }

  // ─── Conversation Info ────────────────────────────────────────────────────

  async getConversationInfo(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true, bio: true, city: true },
        },
        user2: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true, bio: true, city: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('مکالمه یافت نشد');
    }

    if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
      throw new ForbiddenException('شما دسترسی به این مکالمه را ندارید');
    }

    const isUser1 = conversation.userId1 === userId;
    const otherUser = isUser1 ? conversation.user2 : conversation.user1;

    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
    });

    // Fetch related request if exists
    let request: { id: string; title: string; status: string } | null = null;
    if (conversation.requestId) {
      const req = await this.prisma.serviceRequest.findUnique({
        where: { id: conversation.requestId },
        select: { id: true, title: true, status: true },
      });
      if (req) request = req;
    }

    return {
      id: conversation.id,
      requestId: conversation.requestId,
      request,
      participants: [
        {
          ...conversation.user1,
          displayName: conversation.user1.displayName || `${conversation.user1.firstName} ${conversation.user1.lastName}`.trim(),
        },
        {
          ...conversation.user2,
          displayName: conversation.user2.displayName || `${conversation.user2.firstName} ${conversation.user2.lastName}`.trim(),
        },
      ],
      otherUser: {
        ...otherUser,
        displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
      },
      unreadCount,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    };
  }

  // ─── Blocking ─────────────────────────────────────────────────────────────

  async blockUser(userId: string, blockedUserId: string) {
    if (userId === blockedUserId) {
      throw new BadRequestException('نمی‌توانید خودتان را مسدود کنید');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: blockedUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('کاربر مورد نظر یافت نشد');
    }

    // Find any existing conversation between these users
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: userId, userId2: blockedUserId },
          { userId1: blockedUserId, userId2: userId },
        ],
      },
    });

    if (existingConversation) {
      // Add a system blocked message
      await this.prisma.message.create({
        data: {
          conversationId: existingConversation.id,
          senderId: 'SYSTEM',
          content: 'این مکالمه توسط یکی از کاربران مسدود شده است',
          type: 'SYSTEM_BLOCKED',
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return {
      message: 'کاربر با موفقیت مسدود شد',
      blockedUserId,
    };
  }

  async unblockUser(userId: string, blockedUserId: string) {
    if (userId === blockedUserId) {
      throw new BadRequestException('عملیات نامعتبر');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: blockedUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('کاربر مورد نظر یافت نشد');
    }

    // Find any existing conversation and remove blocked system messages
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: userId, userId2: blockedUserId },
          { userId1: blockedUserId, userId2: userId },
        ],
      },
    });

    if (existingConversation) {
      await this.prisma.message.deleteMany({
        where: {
          conversationId: existingConversation.id,
          type: 'SYSTEM_BLOCKED',
        },
      });

      // Add unblocked message
      await this.prisma.message.create({
        data: {
          conversationId: existingConversation.id,
          senderId: 'SYSTEM',
          content: 'مکالمه مجدداً فعال شد',
          type: 'SYSTEM',
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return {
      message: 'کاربر از حالت مسدود خارج شد',
      unblockedUserId: blockedUserId,
    };
  }

  // ─── Unread Count ──────────────────────────────────────────────────────────

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        conversation: {
          OR: [{ userId1: userId }, { userId2: userId }],
        },
        isRead: false,
        senderId: { not: userId },
        type: { notIn: ['SYSTEM', 'DELETED'] },
      },
    });

    return {
      count,
    };
  }

  // ─── Conversation Deletion ────────────────────────────────────────────────

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
}
