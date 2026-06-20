import { db } from '@/lib/db';
import {
  buildNeedContext,
  qualifyBusinessesForVipBroadcast,
} from './business-matching';
import { sendVipLeadToBusiness } from './send-vip-lead';
import { getLeadMaxPerRequest, getVipTtlMs } from './env';
import { scheduleNeedExpiry } from './need-visibility';

export interface VipBroadcastResult {
  requestId: string;
  qualified: number;
  sent: number;
  skipped: number;
  errors: number;
  vipExpiresAt: string | null;
}

export async function runVipBroadcast(requestId: string): Promise<VipBroadcastResult> {
  const result: VipBroadcastResult = {
    requestId,
    qualified: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    vipExpiresAt: null,
  };

  const request = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true, moderationStatus: true },
  });

  if (!request || request.status !== 'OPEN' || request.moderationStatus !== 'APPROVED') {
    return result;
  }

  const vipExpiresAt = new Date(Date.now() + getVipTtlMs());

  await db.serviceRequest.update({
    where: { id: requestId },
    data: {
      needAccessStatus: 'PRIVATE',
      vipExpiresAt,
    },
  });

  result.vipExpiresAt = vipExpiresAt.toISOString();

  const need = await buildNeedContext(requestId);
  if (!need) return result;

  const qualified = await qualifyBusinessesForVipBroadcast(need, request.userId);
  result.qualified = qualified.length;

  const maxPerRequest = getLeadMaxPerRequest();
  let sentCount = 0;

  for (const business of qualified) {
    if (sentCount >= maxPerRequest) break;

    const outcome = await sendVipLeadToBusiness({
      requestId,
      need,
      business,
      needOwnerUserId: request.userId,
    });

    if (outcome.ok) {
      sentCount++;
      result.sent++;
    } else if (outcome.skipReason === 'send_error') {
      result.errors++;
    } else {
      result.skipped++;
    }
  }

  await scheduleNeedExpiry(requestId);

  return result;
}
