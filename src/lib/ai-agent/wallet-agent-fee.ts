import type { Prisma } from '@prisma/client';
import { paymentRequiredError } from './errors';

export async function deductAgentMessageFee(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    referenceId: string;
  },
) {
  const existing = await tx.transaction.findFirst({
    where: { referenceId: params.idempotencyKey, type: 'PAYMENT', status: 'COMPLETED' },
  });
  if (existing) return { transaction: existing, duplicate: true as const };

  await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.userId} FOR UPDATE`;

  let wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
  if (!wallet) wallet = await tx.wallet.create({ data: { userId: params.userId } });

  const available = wallet.balance - wallet.frozen;
  if (available < params.amount) throw paymentRequiredError();

  const updated = await tx.wallet.update({
    where: { userId: params.userId },
    data: { balance: { decrement: params.amount } },
  });

  const transaction = await tx.transaction.create({
    data: {
      walletId: updated.id,
      userId: params.userId,
      type: 'PAYMENT',
      amount: params.amount,
      status: 'COMPLETED',
      referenceId: params.idempotencyKey,
      description: `agent-message:${params.referenceId}`,
    },
  });
  return { transaction, duplicate: false as const };
}

export async function refundAgentMessageFee(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    referenceId: string;
  },
) {
  const refundKey = `${params.idempotencyKey}:refund`;
  const existing = await tx.transaction.findFirst({
    where: { referenceId: refundKey, type: 'REFUND', status: 'COMPLETED' },
  });
  if (existing) return { transaction: existing, duplicate: true as const };

  await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.userId} FOR UPDATE`;

  let wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
  if (!wallet) wallet = await tx.wallet.create({ data: { userId: params.userId } });

  const updated = await tx.wallet.update({
    where: { userId: params.userId },
    data: { balance: { increment: params.amount } },
  });

  const transaction = await tx.transaction.create({
    data: {
      walletId: updated.id,
      userId: params.userId,
      type: 'REFUND',
      amount: params.amount,
      status: 'COMPLETED',
      referenceId: refundKey,
      description: `agent-message-refund:${params.referenceId}`,
    },
  });
  return { transaction, duplicate: false as const };
}
