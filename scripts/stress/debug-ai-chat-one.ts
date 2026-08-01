import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateToken, daysFromNow } from '../../src/lib/auth';
import { ensurePlatformAiConversationForUser } from '../../src/lib/platform-ai/conversation';

const prisma = new PrismaClient();
const prompt = process.argv[2] || 'دسته‌بندی‌های سایت چیه؟';
const base = 'http://127.0.0.1:3000';

async function main() {
  const phone = (process.env.SUPER_ADMIN_PHONES ?? '09374333028').split(',')[0]!.trim();
  const user = await prisma.user.findFirst({ where: { OR: [{ phone }, { role: 'SUPER_ADMIN' }] } });
  if (!user) throw new Error('no user');
  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 99_999_000, frozen: 0 },
    update: { balance: 99_999_000 },
  });
  const token = generateToken();
  await prisma.authToken.create({ data: { token, userId: user.id, expiresAt: daysFromNow(1) } });
  const { conversation } = await ensurePlatformAiConversationForUser(user.id);
  const clientTempId = randomUUID();

  console.log('POST', prompt);
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ conversationId: conversation.id, content: prompt, clientTempId }),
  });
  console.log('status', res.status, res.headers.get('content-type'));
  const text = await res.text();
  console.log(text.slice(0, 4000));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
