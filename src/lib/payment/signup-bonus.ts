import { db } from '@/lib/db';
import { getSignupBonusToman } from '@/lib/payment/env';

const SIGNUP_BONUS_DESCRIPTION = 'اعتبار هدیه خوش‌آمدگویی کسب‌وکار جدید';

/**
 * One-time welcome credit granted the first time a user gets a BusinessProfile
 * (not on plain CLIENT signup, to avoid trivial farming). Idempotent per userId —
 * safe to call every time ensureBusinessProfile runs.
 */
export async function grantSignupBonusIfEligible(userId: string): Promise<void> {
  const already = await db.transaction.findFirst({
    where: { userId, type: 'BONUS', description: SIGNUP_BONUS_DESCRIPTION },
  });
  if (already) return;

  const amount = getSignupBonusToman();
  if (amount <= 0) return;

  let wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await db.wallet.create({ data: { userId } });
  }

  await db.$transaction(async (tx) => {
    // Re-check under the same transaction to guard the rare concurrent-call race.
    const recheck = await tx.transaction.findFirst({
      where: { userId, type: 'BONUS', description: SIGNUP_BONUS_DESCRIPTION },
    });
    if (recheck) return;

    await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet!.id,
        userId,
        type: 'BONUS',
        amount,
        status: 'COMPLETED',
        description: SIGNUP_BONUS_DESCRIPTION,
      },
    });
  });
}
