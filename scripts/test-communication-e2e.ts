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

async function main() {
  await assertFanoutProtected();

  const conv = await db.conversation.findFirst({
    orderBy: { updatedAt: 'desc' },
    include: { user1: true, user2: true },
  });

  if (!conv) {
    console.log('SKIP: no conversations in DB — run seed:chat-demos');
    process.exit(0);
  }

  const senderId = conv.userId1;
  const msg = await db.message.create({
    data: {
      conversationId: conv.id,
      senderId,
      content: `[e2e] smoke ${Date.now()}`,
      type: 'TEXT',
      clientTempId: `e2e-${Date.now()}`,
    },
  });

  await publishMessageNew({
    id: msg.id,
    conversationId: conv.id,
    senderId,
    content: msg.content,
    type: 'TEXT',
    attachmentUrls: [],
    isRead: false,
    createdAt: msg.createdAt.toISOString(),
    clientTempId: msg.clientTempId ?? undefined,
  });

  console.log('OK: message persisted + Redis fanout published', msg.id);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
