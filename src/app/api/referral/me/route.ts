import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { SITE_URL } from '@/lib/constants';

export const runtime = 'nodejs';

function referralCodeForUser(userId: string): string {
  return `NF-${userId.slice(-6).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const code = referralCodeForUser(user.id);
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
