/**
 * Minimal communication smoke test (no browser).
 * Requires: DATABASE_URL, optional REDIS_URL, running chat-service on :3004 for socket leg.
 */
import { PrismaClient } from '@prisma/client';
import { publishMessageNew } from '../src/lib/communication/redis-publish';

const db = new PrismaClient();

async function main() {
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
