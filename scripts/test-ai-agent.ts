/**
 * AI Agent wallet fee concurrency + local handler smoke test.
 * Run: npx tsx scripts/test-ai-agent.ts
 */
import { PrismaClient } from '@prisma/client';
import { deductAgentMessageFee, refundAgentMessageFee } from '../src/lib/ai-agent/wallet-agent-fee';
import { checkUserAccountStatus, executeAgentTool } from '../src/lib/ai-agent/tools';

const prisma = new PrismaClient();

async function ensureTestUser() {
  const email = 'ai-agent-test@needfinder.internal';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        firstName: 'AI',
        lastName: 'Test',
        role: 'CLIENT',
        isVerified: true,
        isActive: true,
      },
    });
  }
  let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: user.id, balance: 2000, frozen: 0 } });
  } else if (wallet.balance < 2000) {
    wallet = await prisma.wallet.update({
      where: { userId: user.id },
      data: { balance: 2000 },
    });
  }
  return user;
}

async function deductWithRetry(userId: string, idempotencyKey: string, amount: number) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) =>
          deductAgentMessageFee(tx, {
            userId,
            amount,
            idempotencyKey,
            referenceId: 'test-conv',
          }),
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
      if (attempt < 4 && (msg.includes('40001') || code === 'P2034')) continue;
      throw e;
    }
  }
  throw new Error('deductWithRetry exhausted');
}

async function testIdempotentDeduct(userId: string) {
  const key = `agent-idempotent:${Date.now()}`;
  const first = await deductWithRetry(userId, key, 500);
  const second = await deductWithRetry(userId, key, 500);
  if (!first.duplicate && second.duplicate) {
    console.log('idempotent deduct: OK');
    return;
  }
  if (first.duplicate && second.duplicate) {
    console.log('idempotent deduct (replay): OK');
    return;
  }
  throw new Error('idempotency mismatch');
}

async function testConcurrentDeduct(userId: string) {
  await prisma.wallet.update({ where: { userId }, data: { balance: 5000, frozen: 0 } });
  const key = `agent-test:${Date.now()}`;
  const amount = 500;
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, (_, i) => deductWithRetry(userId, `${key}:${i}`, amount)),
  );
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  if (ok !== 5) {
    const reasons = results
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason?.message ?? 'unknown');
    throw new Error(`expected 5 deducts, got ${ok}: ${reasons.join('; ')}`);
  }
  console.log('concurrent deduct: OK');
}

async function testInsufficientBalance(userId: string) {
  await prisma.wallet.update({ where: { userId }, data: { balance: 0, frozen: 0 } });
  let caught = false;
  try {
    await prisma.$transaction(async (tx) =>
      deductAgentMessageFee(tx, {
        userId,
        amount: 500,
        idempotencyKey: `agent-insufficient:${Date.now()}`,
        referenceId: 'test',
      }),
    );
  } catch (e: any) {
    caught = e?.code === 'INSUFFICIENT_BALANCE' || e?.status === 402;
  }
  if (!caught) throw new Error('expected insufficient balance error');
  await prisma.wallet.update({ where: { userId }, data: { balance: 2000 } });
  console.log('insufficient balance: OK');
}

async function testRefund(userId: string) {
  const key = `agent-refund:${Date.now()}`;
  const before = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  await prisma.$transaction(async (tx) => {
    await deductAgentMessageFee(tx, {
      userId,
      amount: 500,
      idempotencyKey: key,
      referenceId: 'ref-test',
    });
  });
  await prisma.$transaction(async (tx) => {
    await refundAgentMessageFee(tx, {
      userId,
      amount: 500,
      idempotencyKey: key,
      referenceId: 'ref-test',
    });
  });
  const after = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  if (after.balance !== before.balance) throw new Error('refund did not restore balance');
  console.log('refund idempotent: OK');
}

async function testTools(userId: string) {
  const status = await checkUserAccountStatus(userId);
  if (!status.wallet || typeof status.wallet.available !== 'number') {
    throw new Error('account status shape invalid');
  }

  const needsResult = await executeAgentTool(
    'search_needs_agent',
    { query: 'نیاز فعال', limit: 3 },
    { userId },
  );
  if (!needsResult || typeof needsResult !== 'object' || !('needs' in needsResult)) {
    throw new Error('search_needs_agent must return object with needs array');
  }

  const cats = await executeAgentTool('get_site_categories', { depth: 1 }, { userId });
  if (!cats || typeof cats !== 'object' || !('categories' in cats) || !Array.isArray((cats as { categories: unknown }).categories)) {
    throw new Error('get_site_categories must return object with categories array');
  }
  const catSearch = await executeAgentTool('search_site_categories', { query: 'املاک', limit: 5 }, { userId });
  if (!Array.isArray(catSearch)) throw new Error('search_site_categories must return array');
  const cities = await executeAgentTool('search_site_cities', { query: 'تهران', limit: 3 }, { userId });
  if (!Array.isArray(cities)) throw new Error('search_site_cities must return array');

  const businesses = await executeAgentTool(
    'search_businesses_agent',
    { query: 'املاک', limit: 3 },
    { userId },
  );
  if (!businesses || typeof businesses !== 'object' || !('businesses' in businesses)) {
    throw new Error('search_businesses_agent must return object with businesses');
  }

  const knowledge = await executeAgentTool(
    'search_site_knowledge',
    { query: 'ثبت نیاز', limit: 3 },
    { userId },
  );
  if (!knowledge || typeof knowledge !== 'object' || !('chunks' in knowledge)) {
    throw new Error('search_site_knowledge must return object with chunks');
  }

  console.log('tools: OK');
}

async function main() {
  const user = await ensureTestUser();
  await testTools(user.id);
  await testIdempotentDeduct(user.id);
  await testConcurrentDeduct(user.id);
  await testInsufficientBalance(user.id);
  await testRefund(user.id);
  console.log('\nAll AI agent tests passed.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
