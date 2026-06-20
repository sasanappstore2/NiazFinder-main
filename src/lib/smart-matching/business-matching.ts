import { db } from '@/lib/db';
import type { NeedMatchContext } from '@/contracts/need-match';
import { buildNeedMatchContextFromRequest } from '@/lib/need-leads/build-match-context';
import { matchBusinessesForNeed } from '@/lib/need-match/rank-businesses';
import {
  getLeadFeeToman,
  getLeadMinMatchScore,
  getMaxPrivateLeadsPerBusiness,
} from './env';

export type VipQualifiedBusiness = {
  id: string;
  userId: string;
  matchScore: number;
  matchReasonFa: string;
  qualifyScore: number;
  qualifyReasonFa: string;
  walletBalance: number;
  privateLeadCount: number;
};

export async function buildNeedContext(requestId: string): Promise<NeedMatchContext | null> {
  return buildNeedMatchContextFromRequest(requestId);
}

export async function qualifyBusinessesForVipBroadcast(
  need: NeedMatchContext,
  needOwnerUserId: string
): Promise<VipQualifiedBusiness[]> {
  const minScore = getLeadMinMatchScore();
  const leadFee = getLeadFeeToman();
  const maxPrivateLeads = getMaxPrivateLeadsPerBusiness();
  const { businesses } = await matchBusinessesForNeed(need, 30);

  const qualified: VipQualifiedBusiness[] = [];

  for (const b of businesses) {
    if (b.matchScore < minScore) continue;
    if (b.userId === needOwnerUserId) continue;

    const profile = await db.businessProfile.findFirst({
      where: { OR: [{ id: b.id }, { userId: b.userId }] },
      select: {
        id: true,
        userId: true,
        status: true,
        leadAlertsEnabled: true,
      },
    });

    if (!profile || profile.status !== 'ACTIVE' || profile.leadAlertsEnabled === false) {
      continue;
    }

    const [wallet, privateLeadCount] = await Promise.all([
      db.wallet.findUnique({ where: { userId: profile.userId } }),
      db.needLeadOutreach.count({
        where: {
          businessProfileId: profile.id,
          accessPhase: 'PRIVATE',
          status: 'SENT',
        },
      }),
    ]);

    const balance = wallet?.balance ?? 0;
    const frozen = wallet?.frozen ?? 0;
    const available = balance - frozen;

    if (available < leadFee) continue;
    if (privateLeadCount >= maxPrivateLeads) continue;

    qualified.push({
      id: profile.id,
      userId: profile.userId,
      matchScore: b.matchScore,
      matchReasonFa: b.matchReasonFa,
      qualifyScore: b.matchScore,
      qualifyReasonFa: b.matchReasonFa,
      walletBalance: available,
      privateLeadCount,
    });
  }

  return qualified;
}
