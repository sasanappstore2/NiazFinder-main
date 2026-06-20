/**
 * Repair chat messages stored with "?" placeholder corruption.
 * Run: npx tsx scripts/fix-corrupted-persian-messages.ts
 */
import { PrismaClient } from '@prisma/client';
import { PLATFORM_BOT_WELCOME_MESSAGE } from '../src/lib/platform-ai/conversation';

const prisma = new PrismaClient();

async function main() {
  let fixed = 0;

  const corrupted = await prisma.message.findMany({
    where: { content: { contains: '???' } },
    select: { id: true, content: true },
    take: 500,
  });

  for (const msg of corrupted) {
    if (/^\?{4}!/.test(msg.content) || msg.content.includes('????????')) {
      await prisma.message.update({
        where: { id: msg.id },
        data: { content: PLATFORM_BOT_WELCOME_MESSAGE },
      });
      fixed++;
      console.log('fixed platform welcome:', msg.id);
    }
  }

  const notifications = await prisma.notification.findMany({
    where: { OR: [{ title: { contains: '???' } }, { message: { contains: '???' } }] },
    select: { id: true, title: true, message: true },
    take: 200,
  });

  for (const n of notifications) {
    const patch: { title?: string; message?: string } = {};
    if (/\?{3,} VIP/.test(n.title)) patch.title = '??? VIP ????';
    if (/^\?+ VIP/.test(n.message)) {
      const titlePart = n.message.replace(/^\?+ VIP:?\s*/, '');
      patch.message = titlePart ? `???? VIP: ${titlePart}` : '???? VIP ????';
    }
    if (Object.keys(patch).length) {
      await prisma.notification.update({ where: { id: n.id }, data: patch });
      fixed++;
      console.log('fixed notification:', n.id);
    }
  }

  console.log(`\nDone — repaired ${fixed} row(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
