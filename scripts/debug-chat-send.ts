import { PrismaClient } from '@prisma/client';

async function main() {
  const db = new PrismaClient();
  try {
    const conv = await db.conversation.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!conv) {
      console.log('No conversation');
      return;
    }
    const msg = await db.message.create({
      data: {
        conversationId: conv.id,
        senderId: conv.userId1,
        content: 'debug send',
        type: 'TEXT',
        clientTempId: `debug-${Date.now()}`,
      },
    });
    console.log('create OK', msg.id);
    await db.message.delete({ where: { id: msg.id } });
  } catch (e) {
    console.error('create FAIL', e);
  } finally {
    await db.$disconnect();
  }
}

main();
