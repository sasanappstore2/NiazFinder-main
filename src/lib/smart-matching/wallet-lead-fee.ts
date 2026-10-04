import type { Prisma } from '@prisma/client';
import { SmartMatchingError, SMART_MATCHING_CODES } from './errors';
import { getProLeadDiscountPercent, getBusinessLeadDiscountPercent } from '@/lib/payment/env';

/** Applies the user's subscription-plan discount (if any) to a base lead fee. */
export async function getLeadFeeForUser(
  tx: Prisma.TransactionClient,
  userId: string,
  baseFeeToman: number
): Promise<number> {
  const subscription = await tx.subscription.findUnique({ where: { userId } });
  if (!subscription) return baseFeeToman;

  const discountPercent =
    subscription.plan === 'BUSINESS'
      ? getBusinessLeadDiscountPercent()
      : subscription.plan === 'PRO'
        ? getProLeadDiscountPercent()
        : 0;

  if (discountPercent <= 0) return baseFeeToman;
  return Math.max(0, Math.round(baseFeeToman * (1 - discountPercent / 100)));
}

export async function deductLeadFee(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    referenceId: string;
  }
) {
  const findExisting = () =>
    tx.transaction.findFirst({
      where: {
        referenceId: params.idempotencyKey,
        type: 'PAYMENT',
        status: 'COMPLETED',
      },
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
  const findExisting = () =>
    tx.transaction.findFirst({
      where: {
        referenceId: params.idempotencyKey,
        type: 'REFUND',
        status: 'COMPLETED',
      },
    });

  // Fast path: skip locking if this refund was already recorded.
  const preLock = await findExisting();
  if (preLock) return { transaction: preLock, duplicate: true as const };

  await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.businessUserId} FOR UPDATE`;

  // Authoritative idempotency re-check AFTER the row lock.
  const locked = await findExisting();
  if (locked) return { transaction: locked, duplicate: true as const };

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
