/**
 * Seed demo chat messages (unread) + missed voice calls for mobile nav / chat UI demos.
 *
 * Run: npm run seed:chat-demos
 * Optional: DEMO_CHAT_RECIPIENT=user@email.com  (only one user)
 */
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PEER_SPECS = [
  {
    email: 'chat-demo-peer1@needfinder.local',
    firstName: 'مینا',
    lastName: 'عباسی',
    displayName: 'مینا عباسی',
  },
  {
    email: 'chat-demo-peer2@needfinder.local',
    firstName: 'لیلا',
    lastName: 'قاسمی',
    displayName: 'لیلا قاسمی',
  },
  {
    email: 'chat-demo-peer3@needfinder.local',
    firstName: 'سعید',
    lastName: 'اکبری',
    displayName: 'سعید اکبری',
  },
] as const;

function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password + '_needfinder_salt').digest('hex');
}

function demoIds(recipientId: string) {
  const tag = recipientId.slice(-10);
  return {
    conv: [`chat-demo-${tag}-c1`, `chat-demo-${tag}-c2`, `chat-demo-${tag}-c3`] as const,
    call: [`chat-demo-${tag}-v1`, `chat-demo-${tag}-v2`, `chat-demo-${tag}-v3`] as const,
  };
}

type DemoConvSpec = {
  convIndex: 0 | 1 | 2;
  peerIndex: 0 | 1 | 2;
  lastMessage: string;
  unreadFromPeer: string[];
};

const CONV_SPECS: DemoConvSpec[] = [
  {
    convIndex: 0,
    peerIndex: 0,
    lastMessage: 'طرح UI را آپدیت کردم، لطفاً نگاه کنید.',
    unreadFromPeer: ['سلام، وقتتون بخیر.', 'طرح UI را آپدیت کردم، لطفاً نگاه کنید.'],
  },
  {
    convIndex: 1,
    peerIndex: 1,
    lastMessage: 'متن صفحه اصلی آماده است — یک بازبینی کوتاه لازم داریم.',
    unreadFromPeer: ['متن صفحه اصلی آماده است — یک بازبینی کوتاه لازم داریم.'],
  },
  {
    convIndex: 2,
    peerIndex: 2,
    lastMessage: 'نسخه تست اپ آماده است. امروز می‌تونیم تماس بگیریم؟',
    unreadFromPeer: [
      'سلام، درباره اپ رستوران پیام دادم.',
      'نسخه تست آماده است.',
      'نسخه تست اپ آماده است. امروز می‌تونیم تماس بگیریم؟',
    ],
  },
];

async function ensurePeers() {
  const peers = [];
  for (const spec of PEER_SPECS) {
    peers.push(
      await prisma.user.upsert({
        where: { email: spec.email },
        create: {
          email: spec.email,
          password: simpleHash('123456'),
          firstName: spec.firstName,
          lastName: spec.lastName,
          displayName: spec.displayName,
          city: 'تهران',
          province: 'تهران',
          role: 'SPECIALIST',
          isVerified: true,
          isActive: true,
          emailVerified: true,
          online: true,
        },
        update: {
          firstName: spec.firstName,
          lastName: spec.lastName,
          displayName: spec.displayName,
          isActive: true,
        },
      })
    );
  }
  return peers;
}

async function resolveRecipients() {
  const email = process.env.DEMO_CHAT_RECIPIENT?.trim();
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`کاربر ${email} یافت نشد.`);
    return [user];
  }
  const users = await prisma.user.findMany({
    where: { isActive: true, email: { not: { startsWith: 'chat-demo-peer' } } },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  if (users.length > 0) return users;
  return [
    await prisma.user.create({
      data: {
        email: 'chat-demo-recipient@needfinder.local',
        password: simpleHash('123456'),
        phone: '09129990001',
        firstName: 'رضا',
        lastName: 'کریمی',
        displayName: 'رضا کریمی (دمو)',
        city: 'تهران',
        province: 'تهران',
        role: 'CLIENT',
        isVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
      },
    }),
  ];
}

async function cleanupLegacyDemoRows() {
  await prisma.message.deleteMany({ where: { conversationId: { startsWith: 'chat-demo-' } } });
  await prisma.voiceCall.deleteMany({ where: { id: { startsWith: 'chat-demo-' } } });
  await prisma.conversation.deleteMany({ where: { id: { startsWith: 'chat-demo-' } } });
}

async function seedForRecipient(
  recipient: { id: string; email: string; displayName: string | null },
  peers: Awaited<ReturnType<typeof ensurePeers>>
) {
  const ids = demoIds(recipient.id);
  const allConvIds = [...ids.conv];
  const allCallIds = [...ids.call];

  await prisma.message.deleteMany({ where: { conversationId: { in: allConvIds } } });
  await prisma.voiceCall.deleteMany({ where: { id: { in: allCallIds } } });
  await prisma.conversation.deleteMany({ where: { id: { in: allConvIds } } });

  const now = Date.now();
  let totalUnread = 0;

  for (const [index, spec] of CONV_SPECS.entries()) {
    const peer = peers[spec.peerIndex];
    const convId = ids.conv[spec.convIndex];
    const lastAt = new Date(now - (index + 1) * 45 * 60_000);

    await prisma.conversation.create({
      data: {
        id: convId,
        userId1: recipient.id,
        userId2: peer.id,
        lastMessage: spec.lastMessage,
        lastMessageAt: lastAt,
      },
    });

    await prisma.message.create({
      data: {
        conversationId: convId,
        senderId: recipient.id,
        content: 'سلام، ممنون از پیام‌تون.',
        type: 'TEXT',
        isRead: true,
        readAt: new Date(lastAt.getTime() - 120_000),
        createdAt: new Date(lastAt.getTime() - 180_000),
      },
    });

    for (const [msgIndex, text] of spec.unreadFromPeer.entries()) {
      await prisma.message.create({
        data: {
          conversationId: convId,
          senderId: peer.id,
          content: text,
          type: 'TEXT',
          isRead: false,
          createdAt: new Date(lastAt.getTime() + msgIndex * 60_000),
        },
      });
      totalUnread += 1;
    }
  }

  await prisma.voiceCall.create({
    data: {
      id: ids.call[0],
      callerId: peers[0].id,
      calleeId: recipient.id,
      conversationId: ids.conv[0],
      status: 'MISSED',
      startedAt: new Date(now - 2 * 60 * 60_000),
      endedAt: new Date(now - 2 * 60 * 60_000 + 30_000),
    },
  });

  await prisma.voiceCall.create({
    data: {
      id: ids.call[1],
      callerId: peers[2].id,
      calleeId: recipient.id,
      conversationId: ids.conv[2],
      status: 'MISSED',
      startedAt: new Date(now - 5 * 60 * 60_000),
      endedAt: new Date(now - 5 * 60 * 60_000 + 45_000),
    },
  });

  await prisma.voiceCall.create({
    data: {
      id: ids.call[2],
      callerId: peers[1].id,
      calleeId: recipient.id,
      conversationId: ids.conv[1],
      status: 'ENDED',
      startedAt: new Date(now - 26 * 60 * 60_000),
      endedAt: new Date(now - 26 * 60 * 60_000 + 4 * 60_000),
      durationSec: 240,
    },
  });

  return totalUnread;
}

async function main() {
  console.log('💬 Seed demo chat (messages + missed calls)\n');

  const peers = await ensurePeers();
  const recipients = await resolveRecipients();

  console.log(`👥 طرف‌های گفتگو: ${peers.map((p) => p.displayName).join('، ')}\n`);

  await cleanupLegacyDemoRows();

  for (const recipient of recipients) {
    const unread = await seedForRecipient(recipient, peers);
    console.log(
      `  ✓ ${recipient.displayName || recipient.email}: ${unread} پیام خوانده‌نشده + 2 تماس از دست‌رفته`
    );
  }

  console.log('\n✅ Done');
  console.log('   /chat را باز کنید — آلرت سبز (پیام) و قرمز (تماس از دست‌رفته) در ناوبری موبایل');
  console.log('   اجرای مجدد: npm run seed:chat-demos');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
