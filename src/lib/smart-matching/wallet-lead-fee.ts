import type { Prisma } from '@prisma/client';
import { SmartMatchingError, SMART_MATCHING_CODES } from './errors';

export async function deductLeadFee(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    referenceId: string;
  }
) {
  const existing = await tx.transaction.findFirst({
    where: {
      referenceId: params.idempotencyKey,
      type: 'PAYMENT',
      status: 'COMPLETED',
    },
  });
  if (existing) return { transaction: existing, duplicate: true as const };

  await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.userId} FOR UPDATE`;

  let wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
  if (!wallet) {
    wallet = await tx.wallet.create({ data: { userId: params.userId } });
  }

  const available = wallet.balance - wallet.frozen;
  if (available < params.amount) {
    throw new SmartMatchingError(
      'موجودی کیف پول کافی نیست',
      SMART_MATCHING_CODES.INSUFFICIENT_BALANCE,
      400
    );
  }

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
      description: `lead-fee:${params.referenceId}`,
    },
  });

  return { transaction, duplicate: false as const };
}

export async function refundLeadFee(
  tx: Prisma.TransactionClient,
  params: {
    businessUserId: string;
    amount: number;
    idempotencyKey: string;
    referenceId: string;
  }
) {
  const existing = await tx.transaction.findFirst({
    where: {
      referenceId: params.idempotencyKey,
      type: 'REFUND',
      status: 'COMPLETED',
    },
  });
  if (existing) return { transaction: existing, duplicate: true as const };

  await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.businessUserId} FOR UPDATE`;

  let wallet = await tx.wallet.findUnique({ where: { userId: params.businessUserId } });
  if (!wallet) {
    wallet = await tx.wallet.create({ data: { userId: params.businessUserId } });
  }

  const updated = await tx.wallet.update({
    where: { userId: params.businessUserId },
    data: { balance: { increment: params.amount } },
  });

  const transaction = await tx.transaction.create({
    data: {
      walletId: updated.id,
      userId: params.businessUserId,
      type: 'REFUND',
      amount: params.amount,
      status: 'COMPLETED',
      referenceId: params.idempotencyKey,
      description: `lead-fee-refund:${params.referenceId}`,
    },
  });

  return { transaction, duplicate: false as const };
}
