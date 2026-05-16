import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Logger, UnauthorizedException } from '@nestjs/common';
import Redis from 'ioredis';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    user?: any;
  };
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ─── Gateway ─────────────────────────────────────────────────────────────────

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  /** userId → Set of socketIds */
  private connectedClients = new Map<string, Set<string>>();

  /** Rate limiter: userId → { count, resetAt } */
  private rateLimiter = new Map<string, RateLimitEntry>();

  /** Message rate limit: max 30 messages per 60 seconds */
  private readonly RATE_LIMIT_MAX = 30;
  private readonly RATE_LIMIT_WINDOW_MS = 60_000;

  /** Redis Pub/Sub subscribers (separate connections) */
  private redisPublisher: Redis | null = null;
  private redisSubscriber: Redis | null = null;

  private readonly REDIS_CHANNELS = {
    MESSAGES: 'chat:messages',
    PRESENCE: 'chat:presence',
    NOTIFICATIONS: 'notifications',
    REQUESTS: 'requests',
    PROPOSALS: 'proposals',
  };

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.initRedis();
  }

  // ─── Redis Init ──────────────────────────────────────────────────────────

  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redisPublisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redisSubscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await Promise.all([this.redisPublisher.connect(), this.redisSubscriber.connect()]);

      // Subscribe to all channels
      await this.redisSubscriber.subscribe(
        this.REDIS_CHANNELS.MESSAGES,
        this.REDIS_CHANNELS.PRESENCE,
        this.REDIS_CHANNELS.NOTIFICATIONS,
        this.REDIS_CHANNELS.REQUESTS,
        this.REDIS_CHANNELS.PROPOSALS,
      );

      this.redisSubscriber.on('message', (channel: string, message: string) => {
        this.handleRedisMessage(channel, message);
      });

      this.logger.log('✅ Redis Pub/Sub connected for chat gateway');
    } catch (error) {
      this.logger.warn(
        `⚠️ Redis not available, running in single-instance mode: ${error instanceof Error ? error.message : error}`,
      );
      this.redisPublisher = null;
      this.redisSubscriber = null;
    }
  }

  private async handleRedisMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case this.REDIS_CHANNELS.MESSAGES:
          this.handleCrossInstanceMessage(data);
          break;
        case this.REDIS_CHANNELS.PRESENCE:
          this.handleCrossInstancePresence(data);
          break;
        case this.REDIS_CHANNELS.NOTIFICATIONS:
          this.handleCrossInstanceNotification(data);
          break;
        case this.REDIS_CHANNELS.REQUESTS:
          this.handleCrossInstanceRequest(data);
          break;
        case this.REDIS_CHANNELS.PROPOSALS:
          this.handleCrossInstanceProposal(data);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to handle Redis message on ${channel}: ${error}`);
    }
  }

  private handleCrossInstanceMessage(data: any) {
    const { conversationId, senderId, message } = data;
    // Don't re-emit to the sender's sockets on this instance
    this.server
      .to(`conversation:${conversationId}`)
      .except(Array.from(this.getUserSocketIds(senderId)))
      .emit('newMessage', message);
  }

  private handleCrossInstancePresence(data: any) {
    const { userId, online, lastSeenAt } = data;
    if (online) {
      this.emitToAllUserConversations(userId, 'userOnline', {
        userId,
        lastSeenAt,
      });
    } else {
      this.emitToAllUserConversations(userId, 'userOffline', {
        userId,
        lastSeenAt,
      });
    }
  }

  private handleCrossInstanceNotification(data: any) {
    const { userId, notification } = data;
    this.server.to(`user:${userId}`).emit('newNotification', notification);
  }

  private handleCrossInstanceRequest(data: any) {
    const { userId, event, payload } = data;
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  private handleCrossInstanceProposal(data: any) {
    const { userId, event, payload } = data;
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private getUserSocketIds(userId: string): Set<string> {
    return this.connectedClients.get(userId) || new Set();
  }

  private async emitToAllUserConversations(userId: string, event: string, payload: any) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ userId1: userId }, { userId2: userId }] },
      select: { id: true },
    });

    for (const conv of conversations) {
      this.server.to(`conversation:${conv.id}`).emit(event, payload);
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

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimiter.get(userId);

    if (!entry || now >= entry.resetAt) {
      this.rateLimiter.set(userId, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS });
      return true;
    }

    if (entry.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    entry.count++;
    return true;
  }

  private formatMessage(message: any, userId: string) {
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      attachmentUrls: message.attachmentUrls,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
      sender: message.senderId === 'SYSTEM'
        ? null
        : {
            id: message.sender?.id || message.senderId,
            displayName:
              message.sender?.displayName ||
              `${message.sender?.firstName || ''} ${message.sender?.lastName || ''}`.trim(),
            avatar: message.sender?.avatar,
          },
      isMine: message.senderId === userId,
    };
  }

  // ─── Connection / Disconnection ──────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: no token provided for socket ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
      });

      // Verify token exists in DB
      const authToken = await this.prisma.authToken.findFirst({
        where: { userId: payload.sub, token },
        include: { user: { select: { id: true, isActive: true, isBanned: true } } },
      });

      if (!authToken) {
        this.logger.warn(`Connection rejected: invalid token for socket ${client.id}`);
        client.disconnect();
        return;
      }

      if (authToken.expiresAt < new Date()) {
        this.logger.warn(`Connection rejected: expired token for socket ${client.id}`);
        client.disconnect();
        return;
      }

      const user = authToken.user;
      if (!user.isActive || user.isBanned) {
        this.logger.warn(`Connection rejected: user ${user.id} is inactive/banned`);
        client.disconnect();
        return;
      }

      // Store user data on socket
      (client as AuthenticatedSocket).data.userId = user.id;
      (client as AuthenticatedSocket).data.user = payload;

      // Track connected clients
      if (!this.connectedClients.has(user.id)) {
        this.connectedClients.set(user.id, new Set());
      }
      this.connectedClients.get(user.id)!.add(client.id);

      // Join user's personal room
      await client.join(`user:${user.id}`);

      // Set user online in DB
      await this.prisma.user.update({
        where: { id: user.id },
        data: { online: true, lastSeenAt: new Date() },
      });

      // Emit online status to all relevant rooms
      this.emitToAllUserConversations(user.id, 'userOnline', {
        userId: user.id,
        lastSeenAt: new Date().toISOString(),
      });

      // Publish to Redis for cross-instance
      await this.publishToRedis(this.REDIS_CHANNELS.PRESENCE, {
        userId: user.id,
        online: true,
        lastSeenAt: new Date().toISOString(),
      });

      this.logger.log(`User ${user.id} connected (socket ${client.id})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: authentication failed for socket ${client.id}: ${error instanceof Error ? error.message : error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as AuthenticatedSocket).data?.userId;

    if (userId) {
      // Remove socket from tracking
      const userSockets = this.connectedClients.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedClients.delete(userId);

          // User is completely offline — update DB
          const now = new Date();
          await this.prisma.user.update({
            where: { id: userId },
            data: { online: false, lastSeenAt: now },
          });

          // Emit offline to all relevant rooms
          this.emitToAllUserConversations(userId, 'userOffline', {
            userId,
            lastSeenAt: now.toISOString(),
          });

          // Publish to Redis for cross-instance
          await this.publishToRedis(this.REDIS_CHANNELS.PRESENCE, {
            userId,
            online: false,
            lastSeenAt: now.toISOString(),
          });
        }
      }

      // Leave all rooms
      const rooms = Array.from(client.rooms);
      for (const room of rooms) {
        if (room !== client.id) {
          await client.leave(room);
        }
      }

      this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
    }
  }

  // ─── Conversation Events ─────────────────────────────────────────────────

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { userId } = client.data;
    const { conversationId } = data;

    // Verify user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      client.emit('error', { message: 'مکالمه یافت نشد' });
      return;
    }

    if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
      client.emit('error', { message: 'شما دسترسی به این مکالمه را ندارید' });
      return;
    }

    await client.join(`conversation:${conversationId}`);

    // Get online participants
    const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;
    const otherUserOnline = this.connectedClients.has(otherUserId);

    client.emit('conversationJoined', {
      conversationId,
      participants: [
        { userId, online: true },
        { userId: otherUserId, online: otherUserOnline },
      ],
    });

    this.logger.log(`User ${userId} joined conversation ${conversationId}`);
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(`conversation:${data.conversationId}`);
    this.logger.log(`User ${client.data.userId} left conversation ${data.conversationId}`);
  }

  // ─── Messaging Events ────────────────────────────────────────────────────

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string; fileUrl?: string; fileName?: string; fileSize?: number },
  ) {
    const { userId } = client.data;
    const { conversationId, content, type, fileUrl, fileName, fileSize } = data;

    // Validate content
    if (!content || content.trim().length === 0) {
      client.emit('error', { message: 'محتوای پیام نمی‌تواند خالی باشد' });
      return;
    }

    if (content.length > 10000) {
      client.emit('error', { message: 'محتوای پیام حداکثر ۱۰,۰۰۰ کاراکتر می‌تواند باشد' });
      return;
    }

    // Rate limit check
    if (!this.checkRateLimit(userId)) {
      client.emit('error', { message: 'محدودیت ارسال پیام: حداکثر ۳۰ پیام در دقیقه' });
      return;
    }

    // Verify conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      client.emit('error', { message: 'مکالمه یافت نشد' });
      return;
    }

    if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
      client.emit('error', { message: 'شما دسترسی به این مکالمه را ندارید' });
      return;
    }

    const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;

    // Check if user is blocked
    const isBlocked = await this.prisma.message.count({
      where: {
        conversationId,
        type: 'SYSTEM_BLOCKED',
      },
    });

    // Build attachment data
    const attachmentUrls = fileUrl ? JSON.stringify([fileUrl]) : '[]';

    // Save message to DB
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: content.trim(),
        type: type || 'TEXT',
        attachmentUrls,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
        },
      },
    });

    // Update conversation last message
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content.trim().substring(0, 200),
        lastMessageAt: new Date(),
      },
    });

    const formattedMessage = this.formatMessage(message, userId);

    // Emit to conversation room (local instance)
    this.server.to(`conversation:${conversationId}`).emit('newMessage', formattedMessage);

    // Publish to Redis for cross-instance delivery
    await this.publishToRedis(this.REDIS_CHANNELS.MESSAGES, {
      conversationId,
      senderId: userId,
      message: formattedMessage,
    });

    // Create notification for the other user
    await this.prisma.notification.create({
      data: {
        userId: otherUserId,
        type: 'NEW_MESSAGE',
        title: 'پیام جدید',
        message: content.trim().substring(0, 100),
        data: JSON.stringify({
          conversationId,
          messageId: message.id,
          senderId: userId,
        }),
      },
    });

    // Emit notification to other user's personal room
    this.server.to(`user:${otherUserId}`).emit('newNotification', {
      type: 'NEW_MESSAGE',
      conversationId,
      senderId: userId,
    });

    // Publish notification to Redis
    await this.publishToRedis(this.REDIS_CHANNELS.NOTIFICATIONS, {
      userId: otherUserId,
      notification: {
        type: 'NEW_MESSAGE',
        conversationId,
        senderId: userId,
      },
    });
  }

  // ─── Typing Events ───────────────────────────────────────────────────────

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { userId } = client.data;
    const { conversationId } = data;

    client.to(`conversation:${conversationId}`).emit('userTyping', {
      userId,
      conversationId,
    });
  }

  @SubscribeMessage('stopTyping')
  async handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { userId } = client.data;
    const { conversationId } = data;

    client.to(`conversation:${conversationId}`).emit('userStopTyping', {
      userId,
      conversationId,
    });
  }

  // ─── Read Receipt Events ─────────────────────────────────────────────────

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageIds?: string[] },
  ) {
    const { userId } = client.data;
    const { conversationId, messageIds } = data;

    // Verify participation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) return;
    if (conversation.userId1 !== userId && conversation.userId2 !== userId) return;

    const now = new Date();

    if (messageIds && messageIds.length > 0) {
      // Mark specific messages as read
      await this.prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          conversationId,
          senderId: { not: userId },
          isRead: false,
        },
        data: { isRead: true, readAt: now },
      });
    } else {
      // Mark all unread messages as read
      await this.prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          isRead: false,
        },
        data: { isRead: true, readAt: now },
      });
    }

    const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;

    // Emit read receipt to sender
    this.server.to(`user:${otherUserId}`).emit('messagesRead', {
      conversationId,
      readBy: userId,
      messageIds,
      timestamp: now.toISOString(),
    });
  }

  @SubscribeMessage('messageSeen')
  async handleMessageSeen(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    const { userId } = client.data;
    const { messageId, conversationId } = data;

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true },
    });

    if (!message) return;

    const now = new Date();
    await this.prisma.message.update({
      where: { id: messageId },
      data: { isRead: true, readAt: now },
    });

    // Emit seen status to sender
    this.server.to(`user:${message.senderId}`).emit('messageSeen', {
      messageId,
      conversationId,
      seenBy: userId,
      timestamp: now.toISOString(),
    });
  }

  // ─── Presence Events ─────────────────────────────────────────────────────

  @SubscribeMessage('getOnlineStatus')
  async handleGetOnlineStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    const statusMap: Record<string, boolean> = {};
    for (const uid of data.userIds) {
      statusMap[uid] = this.connectedClients.has(uid);
    }
    client.emit('onlineStatus', statusMap);
  }

  // ─── Periodic Presence Broadcast ─────────────────────────────────────────

  /**
   * Broadcast online users list to all connected clients every 30 seconds.
   * Called externally via a service interval.
   */
  broadcastPresence() {
    const onlineUsers = Array.from(this.connectedClients.keys());
    this.server.emit('presence', { onlineUsers, count: onlineUsers.length });
  }
}
