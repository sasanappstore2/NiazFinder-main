import { db } from '@/lib/db';
import { getReferralRewardToman } from '@/lib/payment/env';

async function isProfileComplete(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { city: true, province: true, phone: true, avatar: true },
  });
  if (!user) return false;
  return Boolean(user.city?.trim() && user.province?.trim() && user.phone?.trim() && user.avatar?.trim());
}

async function hasViewedFirstLead(userId: string): Promise<boolean> {
  const count = await db.needLeadOutreach.count({ where: { businessUserId: userId } });
  return count > 0;
}

/**
 * Referral reward claim: only pays out once the referred user has completed
 * their profile AND seen at least one lead — matches the spec's condition
 * ("فقط ثبت‌نام جایزه نده"). Safe to call repeatedly; no-ops once claimed.
 */
export async function tryClaimReferralReward(referredUserId: string): Promise<void> {
  const referral = await db.referral.findUnique({ where: { referredId: referredUserId } });
  if (!referral || referral.isClaimed) return;

  const [profileComplete, viewedLead] = await Promise.all([
    isProfileComplete(referredUserId),
    hasViewedFirstLead(referredUserId),
  ]);
  if (!profileComplete || !viewedLead) return;

  const rewardAmount = getReferralRewardToman();
  const idempotencyKey = `referral-reward:${referral.id}`;

  await db.$transaction(async (tx) => {
    const locked = await tx.referral.findUnique({ where: { id: referral.id } });
    if (!locked || locked.isClaimed) return;

    const alreadyRewarded = await tx.transaction.findFirst({
      where: { referenceId: idempotencyKey, type: 'BONUS', status: 'COMPLETED' },
    });
    if (alreadyRewarded) return;

    await tx.referral.update({
      where: { id: locked.id },
      data: { isClaimed: true, reward: rewardAmount },
    });

    for (const userId of [locked.referrerId, locked.referredId]) {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId } });
      }
      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: rewardAmount } },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'BONUS',
          amount: rewardAmount,
          status: 'COMPLETED',
          referenceId: idempotencyKey,
          description: 'پاداش رفرال',
        },
      });
    }
  });
}
