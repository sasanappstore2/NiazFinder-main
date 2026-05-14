import { createServer } from 'http';
import { Server } from 'socket.io';
import { db } from './lib/prisma';
import type {
  AuthenticatedSocket,
  SendMessagePayload,
  TypingPayload,
  MarkReadPayload,
  MessageBroadcast,
  ReactionPayload,
  MessageEditPayload,
  MessageDeletePayload,
  MessagePinPayload,
  MessageStarPayload,
} from './lib/types';

// ─── Config ──────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3004;

const onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>
const typingUsers = new Map<string, Set<string>>();  // conversationId -> Set<userId>
const typingTimeouts = new Map<string, NodeJS.Timeout>(); // "userId:conversationId" -> timeout

// ─── Helpers ─────────────────────────────────────────────────────────────

function getOtherUserId(conversationId: string, userId: string): string | null {
  // Store conversation id -> userId1, userId2 mapping in a cache
  return conversationCache.get(conversationId)?.get(userId) || null;
}

const conversationCache = new Map<string, Map<string, string>>();

async function loadConversationParticipants(conversationId: string) {
  if (conversationCache.has(conversationId)) return conversationCache.get(conversationId)!;

  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { userId1: true, userId2: true },
  });

  if (!conv) return null;

  const map = new Map<string, string>();
  map.set(conv.userId1, conv.userId2);
  map.set(conv.userId2, conv.userId1);
  conversationCache.set(conversationId, map);
  return map;
}

function invalidateConversationCache(conversationId: string) {
  conversationCache.delete(conversationId);
}

// ─── Auth Middleware ─────────────────────────────────────────────────────

function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;

  if (!userId || typeof userId !== 'string') {
    return next(new Error('Authentication required: userId is required'));
  }

  // Validate user exists in database
  db.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, isBanned: true, firstName: true, lastName: true, avatar: true },
  }).then(user => {
    if (!user) {
      return next(new Error('User not found'));
    }
    if (!user.isActive || user.isBanned) {
      return next(new Error('User account is not active'));
    }

    socket.data.userId = userId;
    socket.data.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
    };
    next();
  }).catch(err => {
    console.error('Auth error:', err);
    next(new Error('Authentication failed'));
  });
}

// ─── Socket.io Server ────────────────────────────────────────────────────

const httpServer = createServer();

const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

io.use(authenticateSocket);

// ─── Connection Handler ──────────────────────────────────────────────────

io.on('connection', (socket: AuthenticatedSocket) => {
  const userId = socket.data.userId;
  console.log(`👤 User ${userId} connected (socket: ${socket.id})`);

  // Track online status
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socket.id);

  // Update DB: online = true
  db.user.update({
    where: { id: userId },
    data: { online: true, lastSeenAt: new Date() },
  }).catch(console.error);

  // Join all conversations user is part of
  db.conversation.findMany({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
    },
    select: { id: true, userId1: true, userId2: true },
  }).then(conversations => {
    for (const conv of conversations) {
      socket.join(`conv:${conv.id}`);

      // Cache participant mapping
      if (!conversationCache.has(conv.id)) {
        const map = new Map<string, string>();
        map.set(conv.userId1, conv.userId2);
        map.set(conv.userId2, conv.userId1);
        conversationCache.set(conv.id, map);
      }
    }

    // Notify user's contacts that they're online
    const contactIds = new Set<string>();
    for (const conv of conversations) {
      contactIds.add(conv.userId1 === userId ? conv.userId2 : conv.userId1);
    }
    for (const contactId of contactIds) {
      io.to(`user:${contactId}`).emit('user:status', {
        userId,
        online: true,
        lastSeenAt: new Date().toISOString(),
      });
    }
  }).catch(console.error);

  // Join user's personal room
  socket.join(`user:${userId}`);

  // ─── Event: join:conversation ────────────────────────────────────────
  socket.on('join:conversation', async (payload: string) => {
    const conversationId = payload;
    if (!conversationId) return;

    const participants = await loadConversationParticipants(conversationId);
    if (!participants || !participants.has(userId)) {
      return;
    }

    socket.join(`conv:${conversationId}`);
    console.log(`💬 User ${userId} joined conversation ${conversationId}`);
  });

  // ─── Event: leave:conversation ───────────────────────────────────────
  socket.on('leave:conversation', (conversationId: string) => {
    socket.leave(`conv:${conversationId}`);
  });

  // ─── Event: message:send ─────────────────────────────────────────────
  socket.on('message:send', async (payload: SendMessagePayload) => {
    const { conversationId, content, type, attachmentUrls, clientTempId, replyToId } = payload;

    if (!conversationId || !content?.trim()) return;

    // Verify user is participant
    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conv || (conv.userId1 !== userId && conv.userId2 !== userId)) {
      socket.emit('error', { message: 'Access denied to conversation' });
      return;
    }

    const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;

    try {
      // If replying to a message, verify it exists in the same conversation
      let replyTo: { id: string; senderId: string; content: string; firstName: string; lastName: string } | undefined;
      if (replyToId) {
        const repliedMessage = await db.message.findFirst({
          where: { id: replyToId, conversationId },
          select: { id: true, senderId: true, content: true },
          include: { sender: { select: { firstName: true, lastName: true } } },
        });
        if (repliedMessage) {
          replyTo = {
            id: repliedMessage.id,
            senderId: repliedMessage.senderId,
            content: repliedMessage.content.slice(0, 200),
            firstName: repliedMessage.sender.firstName,
            lastName: repliedMessage.sender.lastName,
          };
        }
      }

      // Create message in DB
      const message = await db.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: content.trim(),
          type: type || 'TEXT',
          attachmentUrls: attachmentUrls ? JSON.stringify(attachmentUrls) : '[]',
          isRead: false,
          replyToId: replyTo && replyTo.id,
        },
      });

      // Update conversation last message
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: content.trim().slice(0, 200),
          lastMessageAt: new Date(),
        },
      });

      // Create notification for other user
      await db.notification.create({
        data: {
          userId: otherUserId,
          type: 'NEW_MESSAGE',
          title: 'پیام جدید',
          message: content.trim().slice(0, 100),
          data: JSON.stringify({
            conversationId,
            messageId: message.id,
            senderId: userId,
          }),
        },
      });

      // Broadcast message to conversation room
      const broadcast: MessageBroadcast = {
        id: message.id,
        conversationId,
        senderId: userId,
        content: message.content,
        type: message.type,
        attachmentUrls: JSON.parse(message.attachmentUrls),
        isRead: false,
        createdAt: message.createdAt.toISOString(),
        clientTempId,
        replyToId: replyTo?.id,
        replyTo,
      };

      io.to(`conv:${conversationId}`).emit('message:new', broadcast);

      // Send updated unread count to other user
      const unreadCount = await db.message.count({
        where: {
          conversation: {
            OR: [{ userId1: otherUserId }, { userId2: otherUserId }],
          },
          isRead: false,
          senderId: { not: otherUserId },
        },
      });

      io.to(`user:${otherUserId}`).emit('conversation:unread-update', {
        conversationId,
        unreadCount,
        totalUnread: unreadCount,
      });

      // Update conversation list for both users
      const updatedConv = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user1: { select: { id: true, firstName: true, lastName: true, avatar: true, online: true } },
          user2: { select: { id: true, firstName: true, lastName: true, avatar: true, online: true } },
        },
      });

      if (updatedConv) {
        for (const uid of [conv.userId1, conv.userId2]) {
          const other = uid === conv.userId1 ? updatedConv.user2 : updatedConv.user1;
          const unread = await db.message.count({
            where: {
              conversationId,
              senderId: { not: uid },
              isRead: false,
            },
          });

          io.to(`user:${uid}`).emit('conversation:updated', {
            id: conversationId,
            lastMessage: content.trim().slice(0, 200),
            lastMessageAt: new Date().toISOString(),
            otherUser: {
              id: other.id,
              firstName: other.firstName,
              lastName: other.lastName,
              avatar: other.avatar,
              online: other.online,
            },
            unreadCount: unread,
          });
        }
      }

    } catch (error) {
      console.error('Message send error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ─── Event: message:react ───────────────────────────────────────────
  socket.on('message:react', async (data: ReactionPayload) => {
    try {
      // Find the message to get conversationId and verify participant
      const message = await db.message.findUnique({
        where: { id: data.messageId },
        select: { conversationId: true },
      });
      if (!message) return;

      const conv = await db.conversation.findUnique({
        where: { id: message.conversationId },
        select: { userId1: true, userId2: true },
      });
      if (!conv || (conv.userId1 !== userId && conv.userId2 !== userId)) return;

      // Check if reaction already exists
      const existing = await db.messageReaction.findUnique({
        where: { messageId_userId: { messageId: data.messageId, userId } },
      });

      if (existing) {
        // Remove reaction if same emoji, update if different
        if (existing.emoji === data.emoji) {
          await db.messageReaction.delete({ where: { id: existing.id } });
          io.to(`conv:${message.conversationId}`).emit('message:reaction-removed', {
            messageId: data.messageId,
            userId,
            emoji: data.emoji,
          });
        } else {
          await db.messageReaction.update({
            where: { id: existing.id },
            data: { emoji: data.emoji },
          });
          const user = socket.data.user;
          io.to(`conv:${message.conversationId}`).emit('message:reaction-updated', {
            messageId: data.messageId,
            userId,
            emoji: data.emoji,
            user: { id: userId, firstName: user.firstName, lastName: user.lastName },
          });
        }
      } else {
        // Create new reaction
        const reaction = await db.messageReaction.create({
          data: { messageId: data.messageId, userId, emoji: data.emoji },
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        });
        io.to(`conv:${message.conversationId}`).emit('message:reaction-added', {
          ...reaction,
          createdAt: reaction.createdAt.toISOString(),
        });
      }
    } catch (error) {
      console.error('[react] Error:', error);
    }
  });

  // ─── Event: message:edit ────────────────────────────────────────────
  socket.on('message:edit', async (data: MessageEditPayload) => {
    try {
      const message = await db.message.findFirst({
        where: { id: data.messageId, senderId: userId },
      });
      if (!message) return;

      const updated = await db.message.update({
        where: { id: data.messageId },
        data: { content: data.content, editedAt: new Date() },
      });

      const convId = message.conversationId;
      io.to(`conv:${convId}`).emit('message:edited', {
        id: updated.id,
        conversationId: convId,
        content: updated.content,
        editedAt: updated.editedAt?.toISOString(),
      });
    } catch (error) {
      console.error('[edit] Error:', error);
    }
  });

  // ─── Event: message:delete ──────────────────────────────────────────
  socket.on('message:delete', async (data: MessageDeletePayload) => {
    try {
      const message = await db.message.findFirst({
        where: { id: data.messageId },
      });
      if (!message) return;

      if (data.forEveryone && message.senderId === userId) {
        // Delete for everyone (sender only)
        await db.message.delete({ where: { id: data.messageId } });
        io.to(`conv:${message.conversationId}`).emit('message:deleted', {
          messageId: data.messageId,
          conversationId: message.conversationId,
          forEveryone: true,
        });
      } else {
        // Delete just for current user
        let currentDeletedFor: string[] = [];
        try {
          currentDeletedFor = JSON.parse(message.deletedFor);
        } catch {
          currentDeletedFor = [];
        }
        if (!currentDeletedFor.includes(userId)) {
          currentDeletedFor.push(userId);
          await db.message.update({
            where: { id: data.messageId },
            data: { deletedFor: JSON.stringify(currentDeletedFor) },
          });
        }
        socket.emit('message:deleted', {
          messageId: data.messageId,
          conversationId: message.conversationId,
          forEveryone: false,
        });
      }
    } catch (error) {
      console.error('[delete] Error:', error);
    }
  });

  // ─── Event: message:pin ─────────────────────────────────────────────
  socket.on('message:pin', async (data: MessagePinPayload) => {
    try {
      const conv = await db.conversation.findFirst({
        where: {
          id: data.conversationId,
          OR: [{ userId1: userId }, { userId2: userId }],
        },
      });
      if (!conv) return;

      if (data.unpin) {
        await db.message.update({
          where: { id: data.messageId },
          data: { isPinned: false, pinnedBy: null, pinnedAt: null },
        });
      } else {
        await db.message.update({
          where: { id: data.messageId },
          data: { isPinned: true, pinnedBy: userId, pinnedAt: new Date() },
        });
      }

      io.to(`conv:${data.conversationId}`).emit('message:pin-changed', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        isPinned: !data.unpin,
        pinnedBy: data.unpin ? null : userId,
      });
    } catch (error) {
      console.error('[pin] Error:', error);
    }
  });

  // ─── Event: message:star ────────────────────────────────────────────
  socket.on('message:star', async (data: MessageStarPayload) => {
    try {
      const message = await db.message.findUnique({ where: { id: data.messageId } });
      if (!message) return;

      let starredBy: string[] = [];
      try {
        starredBy = JSON.parse(message.starredBy);
      } catch {
        starredBy = [];
      }

      if (data.unstar) {
        const idx = starredBy.indexOf(userId);
        if (idx >= 0) starredBy.splice(idx, 1);
      } else {
        if (!starredBy.includes(userId)) starredBy.push(userId);
      }

      await db.message.update({
        where: { id: data.messageId },
        data: { starredBy: JSON.stringify(starredBy) },
      });

      socket.emit('message:star-changed', {
        messageId: data.messageId,
        starredBy,
      });
    } catch (error) {
      console.error('[star] Error:', error);
    }
  });

  // ─── Event: typing ───────────────────────────────────────────────────
  socket.on('typing', (payload: TypingPayload) => {
    const { conversationId, isTyping } = payload;
    if (!conversationId) return;

    const room = `conv:${conversationId}`;
    const timeoutKey = `${userId}:${conversationId}`;
    const user = socket.data.user;

    // Clear existing timeout
    const existingTimeout = typingTimeouts.get(timeoutKey);
    if (existingTimeout) clearTimeout(existingTimeout);

    if (isTyping) {
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId)!.add(userId);

      // Broadcast to conversation room (excluding sender)
      socket.to(room).emit('typing', {
        conversationId,
        userId,
        user: { id: userId, firstName: user.firstName, lastName: user.lastName },
        isTyping: true,
      });

      // Auto-stop after 3 seconds
      typingTimeouts.set(timeoutKey, setTimeout(() => {
        typingUsers.get(conversationId)?.delete(userId);
        socket.to(room).emit('typing', {
          conversationId,
          userId,
          user: { id: userId, firstName: user.firstName, lastName: user.lastName },
          isTyping: false,
        });
        typingTimeouts.delete(timeoutKey);
      }, 3000));
    } else {
      typingUsers.get(conversationId)?.delete(userId);

      // Broadcast to conversation room (excluding sender)
      socket.to(room).emit('typing', {
        conversationId,
        userId,
        user: { id: userId, firstName: user.firstName, lastName: user.lastName },
        isTyping: false,
      });
    }
  });

  // ─── Event: message:read ─────────────────────────────────────────────
  socket.on('message:read', async (payload: MarkReadPayload) => {
    const { conversationId } = payload;

    if (!conversationId) return;

    // Verify participant
    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conv || (conv.userId1 !== userId && conv.userId2 !== userId)) return;

    try {
      const result = await db.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      if (result.count > 0) {
        // Notify sender that their messages were read
        const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;

        io.to(`user:${otherUserId}`).emit('message:read-receipt', {
          conversationId,
          readerId: userId,
          count: result.count,
          timestamp: new Date().toISOString(),
        });

        // Broadcast updated unread count
        io.to(`user:${userId}`).emit('conversation:unread-update', {
          conversationId,
          unreadCount: 0,
        });
      }
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // ─── Event: conversation:delete ──────────────────────────────────────
  socket.on('conversation:delete', async (conversationId: string) => {
    if (!conversationId) return;

    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conv || (conv.userId1 !== userId && conv.userId2 !== userId)) return;

    try {
      await db.conversation.delete({ where: { id: conversationId } });
      invalidateConversationCache(conversationId);

      io.to(`conv:${conversationId}`).emit('conversation:deleted', {
        conversationId,
        deletedBy: userId,
      });

      for (const uid of [conv.userId1, conv.userId2]) {
        io.to(`user:${uid}`).emit('conversation:removed', { conversationId });
      }
    } catch (error) {
      console.error('Delete conversation error:', error);
    }
  });

  // ─── Disconnect ──────────────────────────────────────────────────────
  socket.on('disconnect', async (reason) => {
    console.log(`👋 User ${userId} disconnected (socket: ${socket.id}, reason: ${reason})`);

    // Clear any typing timeouts for this user
    for (const [key, timeout] of typingTimeouts.entries()) {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(timeout);
        typingTimeouts.delete(key);
      }
    }

    // Remove socket from user's connections
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);

      // If no more sockets for this user, set offline
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);

        const now = new Date();
        await db.user.update({
          where: { id: userId },
          data: { online: false, lastSeenAt: now },
        }).catch(console.error);

        // Notify contacts that user went offline
        const contactIds = new Set<string>();
        for (const [convId, participants] of conversationCache) {
          if (participants.has(userId)) {
            const contactId = participants.get(userId);
            if (contactId) contactIds.add(contactId);
          }
        }

        const statusPayload = {
          userId,
          online: false,
          lastSeenAt: now.toISOString(),
        };

        for (const contactId of contactIds) {
          io.to(`user:${contactId}`).emit('user:status', statusPayload);
        }
      }
    }
  });

  // ─── Error Handler ───────────────────────────────────────────────────
  socket.on('error', (error) => {
    console.error(`Socket error (${userId}):`, error);
  });
});

// ─── Health check handled via Socket.io middleware ─────────────────────────

// ─── Start Server ────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`💬 NeedFinder Chat Service running on port ${PORT}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────

function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Set all online users to offline
  for (const userId of onlineUsers.keys()) {
    db.user.update({
      where: { id: userId },
      data: { online: false, lastSeenAt: new Date() },
    }).catch(console.error);
  }

  // Clear all typing timeouts
  for (const timeout of typingTimeouts.values()) {
    clearTimeout(timeout);
  }
  typingTimeouts.clear();

  io.close(() => {
    httpServer.close(() => {
      console.log('Chat service closed');
      process.exit(0);
    });
  });

  // Force close after 5 seconds
  setTimeout(() => {
    console.error('Forcing shutdown...');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
