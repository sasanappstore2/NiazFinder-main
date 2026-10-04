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
  const findExisting = () =>
    tx.transaction.findFirst({
      where: { referenceId: params.idempotencyKey, type: 'PAYMENT', status: 'COMPLETED' },
    });

  // Fast path: skip locking if this fee was already recorded.
  const preLock = await findExisting();
  if (preLock) return { transaction: preLock, duplicate: true as const };

  await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.userId} FOR UPDATE`;

  // Authoritative idempotency re-check AFTER the row lock: a concurrent tx may
  // have committed the same referenceId while we waited for the lock. Return
  // gracefully instead of relying solely on Serializable aborts.
  const locked = await findExisting();
  if (locked) return { transaction: locked, duplicate: true as const };

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
  const findExisting = () =>
    tx.transaction.findFirst({
      where: { referenceId: refundKey, type: 'REFUND', status: 'COMPLETED' },
    });

  // Fast path: skip locking if this refund was already recorded.
  const preLock = await findExisting();
  if (preLock) return { transaction: preLock, duplicate: true as const };

  await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.userId} FOR UPDATE`;

  // Authoritative idempotency re-check AFTER the row lock.
  const locked = await findExisting();
  if (locked) return { transaction: locked, duplicate: true as const };

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
