import './lib/load-env';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { db } from './lib/prisma';
import { resolveUserFromSocketAuth } from './lib/auth';
import { startCommRedisSubscriber, stopCommRedisSubscriber } from './lib/redis';
import {
  buildInstantBroadcast,
  fanoutMessageNew,
  persistMessageSend,
  replyInfoFromClientPayload,
  resolveParticipants,
} from './lib/message-dispatch';
import type {
  AuthenticatedSocket,
  SendMessagePayload,
  MessagePreviewPayload,
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
const sendRateBuckets = new Map<string, { count: number; resetAt: number }>();
const SEND_RATE_LIMIT = Number(process.env.CHAT_SEND_RATE_PER_MIN || 60);

function allowSend(userId: string): boolean {
  const now = Date.now();
  const bucket = sendRateBuckets.get(userId);
  if (!bucket || now > bucket.resetAt) {
    sendRateBuckets.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= SEND_RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getOtherUserId(conversationId: string, userId: string): string | null {
  // Store conversation id -> userId1, userId2 mapping in a cache
  return conversationCache.get(conversationId)?.get(userId) || null;
}

const conversationCache = new Map<string, Map<string, string>>();
const CONVERSATION_CACHE_MAX = 500;

function setConversationCache(conversationId: string, map: Map<string, string>) {
  if (conversationCache.size >= CONVERSATION_CACHE_MAX) {
    const oldest = conversationCache.keys().next().value;
    if (oldest) conversationCache.delete(oldest);
  }
  conversationCache.set(conversationId, map);
}

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
  setConversationCache(conversationId, map);
  return map;
}

async function canJoinNeedChatSession(userId: string, conversationId: string): Promise<boolean> {
  const session = await db.needChatSession.findFirst({
    where: { conversationId, status: 'ACTIVE' },
  });
  if (!session) return true;
  return userId === session.customerUserId || userId === session.businessUserId;
}

function invalidateConversationCache(conversationId: string) {
  conversationCache.delete(conversationId);
}

// ─── Auth Middleware ─────────────────────────────────────────────────────

function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  resolveUserFromSocketAuth(socket.handshake.auth)
    .then((user) => {
      if (!user) {
        return next(new Error('Authentication required: valid token is required'));
      }
      socket.data.userId = user.id;
      socket.data.user = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      };
      next();
    })
    .catch((err) => {
      console.error('Auth error:', err);
      next(new Error('Authentication failed'));
    });
}

// ─── Socket.io Server ────────────────────────────────────────────────────

let dispatchCommEvent: (type: string, payload: Record<string, unknown>) => void = () => {};

const FANOUT_MAX_BODY = 64 * 1024;

function verifyInternalSecret(req: import('http').IncomingMessage): boolean {
  const expected =
    process.env.CHAT_INTERNAL_SECRET?.trim() ||
    process.env.INTERNAL_API_SECRET?.trim();
  if (!expected) {
    console.error('[chat-service] CHAT_INTERNAL_SECRET / INTERNAL_API_SECRET not set — fanout disabled');
    return false;
  }
  const header = req.headers['x-internal-secret'];
  return typeof header === 'string' && header === expected;
}

const httpServer = createServer((req, res) => {
  if (req.url === '/internal/fanout' && req.method === 'POST') {
    if (!verifyInternalSecret(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > FANOUT_MAX_BODY) {
        res.writeHead(413);
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        if (parsed.type && parsed.payload) {
          dispatchCommEvent(parsed.type, parsed.payload);
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'chat-service', port: PORT }));
    return;
  }
  if (req.url?.startsWith('/presence') && req.method === 'GET') {
    const parsed = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const ids = parsed.searchParams.get('userIds')?.split(',').map((id) => id.trim()).filter(Boolean) ?? [];
    const presence: Record<string, boolean> = {};
    for (const id of ids) {
      const sockets = onlineUsers.get(id);
      presence[id] = Boolean(sockets && sockets.size > 0);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ presence }));
    return;
  }
  if (req.url === '/metrics' && req.method === 'GET') {
    const activeSockets = [...onlineUsers.values()].reduce((n, set) => n + set.size, 0);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        onlineUsers: onlineUsers.size,
        activeSockets,
        typingRooms: typingUsers.size,
      })
    );
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: false,
  },
});

io.use(authenticateSocket);

async function setupRedisScaling() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return;
  try {
    const pub = new Redis(url, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
    });
    pub.on('error', () => {});
    const sub = pub.duplicate();
    sub.on('error', () => {});
    io.adapter(createAdapter(pub, sub));
    console.log('[chat-service] Socket.io Redis adapter enabled');
  } catch (e) {
    console.warn('[chat-service] Redis adapter unavailable (single-instance mode):', e);
  }
}

void setupRedisScaling();

function handleCommRedisEvent(type: string, payload: Record<string, unknown>) {
  if (type === 'message:new') {
    const p = payload as MessageBroadcast & { recipientUserId?: string };
    io.to(`conv:${p.conversationId}`).emit('message:new', p);
    if (p.recipientUserId) {
      io.to(`user:${p.recipientUserId}`).emit('message:new', p);
    }
    return;
  }
  if (type === 'message:read-receipt') {
    const conversationId = payload.conversationId as string;
    const notifyUserId = payload.notifyUserId as string | undefined;
    if (notifyUserId) {
      io.to(`user:${notifyUserId}`).emit('message:read-receipt', payload);
    }
    if (conversationId) {
      io.to(`conv:${conversationId}`).emit('message:read-receipt', payload);
    }
    return;
  }
  if (type === 'typing') {
    const p = payload as {
      conversationId?: string;
      userId?: string;
      targetUserId?: string;
      isTyping?: boolean;
      user?: { firstName?: string; lastName?: string };
    };
    if (!p.conversationId || !p.userId) return;
    const event = {
      conversationId: p.conversationId,
      userId: p.userId,
      user: {
        id: p.userId,
        firstName: p.user?.firstName ?? '',
        lastName: p.user?.lastName ?? '',
      },
      isTyping: Boolean(p.isTyping),
    };
    if (p.targetUserId) {
      io.to(`user:${p.targetUserId}`).emit('typing', event);
    }
    io.to(`conv:${p.conversationId}`).emit('typing', event);
    return;
  }
  if (type === 'message:react') {
    const conversationId = payload.conversationId as string;
    const eventType =
      (payload.eventType as string) || 'message:reaction-added';
    if (conversationId) {
      io.to(`conv:${conversationId}`).emit(eventType, payload);
    }
    return;
  }
  if (type === 'message:edit') {
    const conversationId = payload.conversationId as string;
    if (conversationId) {
      const messageId =
        (payload.messageId as string | undefined) ??
        (payload.id as string | undefined);
      io.to(`conv:${conversationId}`).emit('message:edited', {
        ...payload,
        messageId,
      });
    }
    return;
  }
  if (type === 'message:delete') {
    const conversationId = payload.conversationId as string;
    if (conversationId) {
      io.to(`conv:${conversationId}`).emit('message:deleted', payload);
    }
    return;
  }
  if (type === 'message:pin') {
    const conversationId = payload.conversationId as string;
    if (conversationId) {
      io.to(`conv:${conversationId}`).emit('message:pin-changed', payload);
    }
    return;
  }
  if (type === 'conversation:unread-update') {
    const conversationId = payload.conversationId as string;
    if (conversationId) {
      io.to(`conv:${conversationId}`).emit('conversation:unread-update', payload);
    }
    return;
  }
  if (type === 'call:invite') {
    const calleeId = payload.calleeId as string | undefined;
    const callId = payload.callId as string | undefined;
    if (!calleeId || !callId) return;
    io.to(`user:${calleeId}`).emit('call:invite', {
      callId,
      callerId: payload.callerId,
      sdpOffer: payload.sdpOffer,
      from: payload.from,
    });
    return;
  }
  if (type === 'call:ringing') {
    const calleeId = payload.calleeId as string | undefined;
    const callId = payload.callId as string | undefined;
    if (!calleeId || !callId) return;
    io.to(`user:${calleeId}`).emit('call:ringing', {
      callId,
      callerId: payload.callerId,
      from: payload.from,
    });
    return;
  }
  if (type === 'call:reject') {
    const targetUserId = payload.targetUserId as string | undefined;
    const callId = payload.callId as string | undefined;
    if (!targetUserId || !callId) return;
    io.to(`user:${targetUserId}`).emit('call:reject', { callId });
    return;
  }
  if (type === 'call:accepted') {
    const targetUserId = payload.targetUserId as string | undefined;
    const callId = payload.callId as string | undefined;
    if (!targetUserId || !callId) return;
    io.to(`user:${targetUserId}`).emit('call:accepted', {
      callId,
      sdpAnswer: payload.sdpAnswer,
    });
    return;
  }
  if (type === 'call:hangup') {
    const targetUserId = payload.targetUserId as string | undefined;
    const callId = payload.callId as string | undefined;
    if (!targetUserId || !callId) return;
    io.to(`user:${targetUserId}`).emit('call:hangup', { callId });
  }
}

dispatchCommEvent = handleCommRedisEvent;
void startCommRedisSubscriber(handleCommRedisEvent);

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

    socket.emit(
      'presence:bulk',
      Array.from(contactIds).map((contactId) => ({
        userId: contactId,
        online: Boolean(onlineUsers.get(contactId)?.size),
      }))
    );
  }).catch(console.error);

  // Join user's personal room
  socket.join(`user:${userId}`);

  // ─── Event: join:conversation ────────────────────────────────────────
  socket.on('join:conversation', (payload: string) => {
    const conversationId = payload;
    if (!conversationId) return;

    void (async () => {
      const cached = conversationCache.get(conversationId);
      if (cached?.has(userId)) {
        const allowed = await canJoinNeedChatSession(userId, conversationId);
        if (allowed) socket.join(`conv:${conversationId}`);
        return;
      }

      const participants = await loadConversationParticipants(conversationId);
      if (!participants?.has(userId)) return;
      const allowed = await canJoinNeedChatSession(userId, conversationId);
      if (!allowed) return;
      socket.join(`conv:${conversationId}`);
    })();
  });

  // ─── Event: leave:conversation ───────────────────────────────────────
  socket.on('leave:conversation', (conversationId: string) => {
    socket.leave(`conv:${conversationId}`);
  });

  // ─── Event: message:preview (legacy — same hot path as send) ───────────
  socket.on('message:preview', (payload: MessagePreviewPayload) => {
    if (!payload.conversationId || !payload.content?.trim() || !payload.clientTempId) return;
    // Same rate-limit + participant authorization as message:send — otherwise a
    // client could flood a peer with fake message:new events.
    if (!allowSend(userId)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const emitPreview = (recipientUserId: string | undefined) => {
      fanoutMessageNew(io, {
        ...buildInstantBroadcast(
          {
            conversationId: payload.conversationId,
            content: payload.content,
            type: payload.type,
            clientTempId: payload.clientTempId,
          },
          userId,
          payload.clientTempId
        ),
        recipientUserId,
      });
    };

    const cached = conversationCache.get(payload.conversationId);
    if (cached?.has(userId)) {
      emitPreview(cached.get(userId));
      return;
    }

    void (async () => {
      const resolved = await resolveParticipants(
        payload.conversationId,
        loadConversationParticipants,
        conversationCache
      );
      if (!resolved?.map.has(userId)) {
        socket.emit('error', { message: 'Access denied to conversation' });
        return;
      }
      emitPreview(resolved.map.get(userId));
    })();
  });

  // ─── Event: message:send — emit FIRST (~0ms), persist AFTER ───────────
  socket.on('message:send', (payload: SendMessagePayload) => {
    const { conversationId, content, clientTempId, replyToId } = payload;

    if (!conversationId || !content?.trim()) return;
    if (!allowSend(userId)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const tempId = clientTempId || `tmp-${userId}-${Date.now()}`;
    const instantPayload: SendMessagePayload = { ...payload, clientTempId: tempId };

    const instantReplyTo = payload.replyTo
      ? replyInfoFromClientPayload(payload.replyTo)
      : undefined;

    const cached = conversationCache.get(conversationId);
    if (cached?.has(userId)) {
      const recipientUserId = cached.get(userId);
      fanoutMessageNew(io, {
        ...buildInstantBroadcast(instantPayload, userId, tempId, instantReplyTo),
        recipientUserId,
      });
      void persistMessageSend(io, userId, instantPayload, replyToId, cached);
      return;
    }

    void (async () => {
      const resolved = await resolveParticipants(
        conversationId,
        loadConversationParticipants,
        conversationCache
      );
      if (!resolved?.map.has(userId)) {
        socket.emit('error', { message: 'Access denied to conversation' });
        return;
      }
      const recipientUserId = resolved.map.get(userId);
      fanoutMessageNew(io, {
        ...buildInstantBroadcast(instantPayload, userId, tempId, instantReplyTo),
        recipientUserId,
      });
      await persistMessageSend(io, userId, instantPayload, replyToId, resolved.map);
    })();
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
        messageId: updated.id,
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
        include: { conversation: true },
      });
      if (!message) return;

      const conv = message.conversation;
      if (conv.userId1 !== userId && conv.userId2 !== userId) return;

      if (data.forEveryone) {
        if (message.senderId !== userId) return;
        const ageMs = Date.now() - message.createdAt.getTime();
        const maxAge = 48 * 60 * 60 * 1000;
        if (ageMs > maxAge) return;

        const tombstone = 'این پیام حذف شد';
        await db.message.update({
          where: { id: data.messageId },
          data: { deletedAt: new Date(), content: tombstone },
        });
        io.to(`conv:${message.conversationId}`).emit('message:deleted', {
          messageId: data.messageId,
          conversationId: message.conversationId,
          forEveryone: true,
        });
        return;
      }

      let currentDeletedFor: string[] = [];
      try {
        const parsed = JSON.parse(message.deletedFor || '[]') as unknown;
        currentDeletedFor = Array.isArray(parsed)
          ? parsed.filter((id): id is string => typeof id === 'string')
          : [];
      } catch {
        currentDeletedFor = [];
      }
      if (!currentDeletedFor.includes(userId)) {
        currentDeletedFor.push(userId);
        await db.message.update({
          where: { id: data.messageId },
          data: { deletedFor: JSON.stringify([...new Set(currentDeletedFor)]) },
        });
      }
      socket.emit('message:deleted', {
        messageId: data.messageId,
        conversationId: message.conversationId,
        forEveryone: false,
        userId,
      });
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
        await db.message.updateMany({
          where: { conversationId: data.conversationId, isPinned: true },
          data: { isPinned: false, pinnedBy: null, pinnedAt: null },
        });
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
        pinnedAt: data.unpin ? null : new Date().toISOString(),
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

    const timeoutKey = `${userId}:${conversationId}`;
    const user = socket.data.user;

    const emitToPeer = (typing: boolean) => {
      const peerId = conversationCache.get(conversationId)?.get(userId);
      const event = {
        conversationId,
        userId,
        user: { id: userId, firstName: user.firstName, lastName: user.lastName },
        isTyping: typing,
      };
      if (peerId) {
        io.to(`user:${peerId}`).emit('typing', event);
      }
      io.to(`conv:${conversationId}`).except(socket.id).emit('typing', event);
    };

    const existingTimeout = typingTimeouts.get(timeoutKey);
    if (existingTimeout) clearTimeout(existingTimeout);

    if (isTyping) {
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId)!.add(userId);
      emitToPeer(true);

      typingTimeouts.set(timeoutKey, setTimeout(() => {
        typingUsers.get(conversationId)?.delete(userId);
        emitToPeer(false);
        typingTimeouts.delete(timeoutKey);
      }, 3000));
    } else {
      typingUsers.get(conversationId)?.delete(userId);
      emitToPeer(false);
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

  // ─── Voice call signaling ───────────────────────────────────────────
  // Invite delivery is server-authoritative via POST /api/calls/:id/invite fanout.
  // Client socket invite relay disabled to avoid duplicate rings.
  socket.on('call:invite', () => {
    /* no-op — use HTTP invite route */
  });

  socket.on('call:accept', (payload: { callId: string; sdpAnswer: RTCSessionDescriptionInit }) => {
    if (!payload?.callId) return;
    db.voiceCall
      .findUnique({ where: { id: payload.callId }, select: { callerId: true, calleeId: true } })
      .then((call) => {
        if (!call) return;
        if (call.callerId !== userId && call.calleeId !== userId) return;
        const peerId = call.callerId === userId ? call.calleeId : call.callerId;
        io.to(`user:${peerId}`).emit('call:accept', payload);
      })
      .catch(console.error);
  });

  socket.on('call:ice-candidate', (payload: { callId: string; candidate: RTCIceCandidateInit }) => {
    if (!payload?.callId) return;
    db.voiceCall
      .findUnique({ where: { id: payload.callId }, select: { callerId: true, calleeId: true } })
      .then((call) => {
        if (!call) return;
        if (call.callerId !== userId && call.calleeId !== userId) return;
        const peerId = call.callerId === userId ? call.calleeId : call.callerId;
        io.to(`user:${peerId}`).emit('call:ice-candidate', payload);
      })
      .catch(console.error);
  });

  socket.on('call:reject', () => {
    /* no-op — server PATCH reject publishes fanout */
  });

  socket.on('call:hangup', () => {
    /* no-op — server PATCH cancel/end publishes fanout */
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

if (!process.env.DATABASE_URL?.trim()) {
  console.error('[chat-service] DATABASE_URL is missing — load repo-root .env (npm run dev:chat from project root)');
} else {
  console.log('[chat-service] DATABASE_URL loaded');
}
if (process.env.REDIS_URL?.trim()) {
  console.log('[chat-service] REDIS_URL loaded — pub/sub fanout enabled');
} else {
  console.warn('[chat-service] REDIS_URL not set — use HTTP /internal/fanout from Next.js');
}

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

  void stopCommRedisSubscriber();

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
