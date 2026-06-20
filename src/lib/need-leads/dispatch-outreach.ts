import { db } from '@/lib/db';
import { buildNeedMatchContextFromRequest } from './build-match-context';
import { qualifyBusinessesForOutreach } from './qualify-outreach';
import { sendLeadToBusiness } from './send-lead-to-business';
import { isLeadOutreachEnabled, getLeadMaxPerRequest } from './env';
import { isSmartMatchingEnabled } from '@/lib/smart-matching/env';

export interface DispatchOutreachResult {
  requestId: string;
  qualified: number;
  sent: number;
  skipped: number;
  errors: number;
}

/** Run proactive AI lead outreach for a published need. */
export async function dispatchNeedLeadOutreach(
  requestId: string
): Promise<DispatchOutreachResult> {
  const result: DispatchOutreachResult = {
    requestId,
    qualified: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  if (!isLeadOutreachEnabled() || isSmartMatchingEnabled()) {
    return result;
  }

  const request = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true },
  });

  if (!request || request.status !== 'OPEN') {
    return result;
  }

  const need = await buildNeedMatchContextFromRequest(requestId);
  if (!need) return result;

  const qualified = await qualifyBusinessesForOutreach(need);
  result.qualified = qualified.length;

  const maxPerRequest = getLeadMaxPerRequest();
  let sentCount = 0;

  for (const business of qualified) {
    if (sentCount >= maxPerRequest) break;

    const outcome = await sendLeadToBusiness({
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

  return result;
}
