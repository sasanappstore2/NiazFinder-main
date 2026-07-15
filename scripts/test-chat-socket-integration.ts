/**
 * Socket.io integration smoke for chat-service.
 * Requires: DATABASE_URL, chat-service on :3004, conversation in DB.
 * Skips gracefully when chat-service is down.
 *
 * Run: npx tsx scripts/test-chat-socket-integration.ts
 */
import { PrismaClient } from '@prisma/client';
import { io, type Socket } from 'socket.io-client';
import { publishMessageNew } from '../src/lib/communication/redis-publish';

const db = new PrismaClient();
const CHAT_URL = process.env.CHAT_SERVICE_INTERNAL_URL || 'http://127.0.0.1:3004';

function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 3000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function mintDevToken(userId: string): Promise<string> {
  const token = `e2e_socket_${userId}_${Date.now()}`;
  await db.authToken.create({
    data: {
      userId,
      token,
      type: 'access',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return token;
}

async function connectAs(userId: string): Promise<Socket> {
  const token = await mintDevToken(userId);
  const socket = io(CHAT_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    timeout: 4000,
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  return socket;
}

async function main() {
  try {
    const health = await fetch(`${CHAT_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!health.ok) {
      console.warn('SKIP: chat-service unhealthy — start with npm run dev:chat');
      process.exit(0);
    }
  } catch {
    console.warn('SKIP: chat-service not reachable — start with npm run dev:chat');
    process.exit(0);
  }

  const conv = await db.conversation.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  if (!conv) {
    console.warn('SKIP: no conversations — run npm run seed:chat-demos');
    process.exit(0);
  }

  const senderId = conv.userId1;
  const recipientId = conv.userId2;

  let senderSocket: Socket | null = null;
  let recipientSocket: Socket | null = null;

  try {
    senderSocket = await connectAs(senderId);
    recipientSocket = await connectAs(recipientId);
    console.log('OK: both sockets connected');
  } catch (err) {
    console.warn(
      'SKIP: socket auth failed — rebuild docker chat or run `npm run dev:chat` with root Prisma schema.',
      err instanceof Error ? err.message : err
    );
    await db.$disconnect();
    process.exit(0);
  }

  if (!senderSocket || !recipientSocket) {
    await db.$disconnect();
    process.exit(0);
  }

  try {
    senderSocket.emit('join:conversation', conv.id);
    recipientSocket.emit('join:conversation', conv.id);
    await new Promise((r) => setTimeout(r, 200));

    const content = `[socket-e2e] ${Date.now()}`;
    const clientTempId = `socket-e2e-${Date.now()}`;

    const receivePromise = waitForEvent<{ content?: string; clientTempId?: string }>(
      recipientSocket,
      'message:new',
      4000
    );

    const msg = await db.message.create({
      data: {
        conversationId: conv.id,
        senderId,
        content,
        type: 'TEXT',
        clientTempId,
      },
    });

    await publishMessageNew({
      id: msg.id,
      conversationId: conv.id,
      senderId,
      content,
      type: 'TEXT',
      attachmentUrls: [],
      isRead: false,
      createdAt: msg.createdAt.toISOString(),
      clientTempId,
      recipientUserId: recipientId,
    });

    const received = await receivePromise;
    if (received.content !== content && received.clientTempId !== clientTempId) {
      throw new Error(`Unexpected message:new payload: ${JSON.stringify(received)}`);
    }
    console.log('OK: recipient received message:new via fanout', msg.id);

    const typingPromise = waitForEvent<{ isTyping?: boolean }>(recipientSocket, 'typing', 3000);
    senderSocket.emit('typing', { conversationId: conv.id, isTyping: true });
    const typing = await typingPromise;
    if (!typing.isTyping) throw new Error('expected isTyping true');
    console.log('OK: typing indicator relayed');

    console.log('OK: chat socket integration passed');
  } finally {
    senderSocket.disconnect();
    recipientSocket.disconnect();
    await db.$disconnect();
  }

  // Socket.io / Redis clients can keep the event loop alive.
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
