import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { SITE_URL } from '@/lib/constants';
import { generateReferralCode } from '@/lib/referral/generate-code';

export const runtime = 'nodejs';

async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (existing?.referralCode) return existing.referralCode;

  // Legacy user created before referralCode existed — backfill lazily.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const updated = await db.user.update({
        where: { id: userId },
        data: { referralCode: generateReferralCode() },
        select: { referralCode: true },
      });
      return updated.referralCode!;
    } catch {
      // unique collision — retry with a fresh random code
    }
  }
  throw new Error('failed to allocate referral code');
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const code = await ensureReferralCode(user.id);
    const referrals = await db.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const successful = referrals.filter((r) => r.isClaimed).length;
    const pending = referrals.length - successful;
    const rewards = referrals.filter((r) => r.isClaimed).reduce((s, r) => s + r.reward, 0);

    return NextResponse.json({
      code,
      url: `${SITE_URL}/register?ref=${encodeURIComponent(code)}`,
      stats: {
        total: referrals.length,
        successful,
        pending,
        rewards,
      },
      history: referrals.map((r) => ({
        id: r.id,
        referredId: r.referredId,
        reward: r.reward,
        isClaimed: r.isClaimed,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Referral me GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
