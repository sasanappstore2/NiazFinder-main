/**
 * Minimal communication smoke test (no browser).
 * Requires: DATABASE_URL, optional REDIS_URL, running chat-service on :3004 for socket leg.
 */
import { PrismaClient } from '@prisma/client';
import { publishMessageNew } from '../src/lib/communication/redis-publish';

const db = new PrismaClient();
const CHAT_URL = process.env.CHAT_SERVICE_INTERNAL_URL || 'http://127.0.0.1:3004';

async function assertFanoutProtected() {
  const res = await fetch(`${CHAT_URL}/internal/fanout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'ping', payload: {} }),
  });
  if (res.status !== 401) {
    throw new Error(`Expected fanout 401 without secret, got ${res.status}`);
  }
  console.log('OK: fanout endpoint rejects unauthenticated requests');
}

async function assertChatServiceHealth() {
  try {
    const res = await fetch(`${CHAT_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      console.warn(`WARN: chat-service health returned ${res.status} — start with npm run dev:chat`);
      return;
    }
    const body = (await res.json()) as { ok?: boolean };
    if (body.ok) {
      console.log('OK: chat-service health');
    }
  } catch {
    console.warn('WARN: chat-service not reachable — realtime tests skipped');
  }
}

async function assertMessageRoundTrip(
  conversationId: string,
  senderId: string,
  recipientUserId: string
) {
  const content = `[e2e] smoke ${Date.now()}`;
  const clientTempId = `e2e-${Date.now()}`;

  const msg = await db.message.create({
    data: {
      conversationId,
      senderId,
      content,
      type: 'TEXT',
      clientTempId,
    },
  });

  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessage: content, lastMessageAt: msg.createdAt },
  });

  const fetched = await db.message.findUnique({ where: { id: msg.id } });
  if (!fetched || fetched.content !== content) {
    throw new Error('Message not readable after create');
  }
  console.log('OK: message persisted in DB', msg.id);

  await publishMessageNew({
    id: msg.id,
    conversationId,
    senderId,
    content: msg.content,
    type: 'TEXT',
    attachmentUrls: [],
    isRead: false,
    createdAt: msg.createdAt.toISOString(),
    clientTempId: msg.clientTempId ?? undefined,
    recipientUserId,
  });

  console.log('OK: Redis fanout published with recipientUserId', recipientUserId);
}

async function main() {
  await assertFanoutProtected();
  await assertChatServiceHealth();

  const conv = await db.conversation.findFirst({
    orderBy: { updatedAt: 'desc' },
    include: { user1: true, user2: true },
  });

  if (!conv) {
    console.log('SKIP: no conversations in DB — run seed:chat-demos');
    process.exit(0);
  }

  const senderId = conv.userId1;
  const recipientUserId = conv.userId2;

  await assertMessageRoundTrip(conv.id, senderId, recipientUserId);

  const recent = await db.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  if (recent.length === 0) {
    throw new Error('Expected at least one message in conversation after round-trip');
  }
  console.log('OK: GET-equivalent DB query returns latest message', recent[0].id);

  await db.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
