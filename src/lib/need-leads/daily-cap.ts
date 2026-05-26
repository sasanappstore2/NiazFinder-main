import { db } from '@/lib/db';
import { getLeadDailyCapPerBusiness } from './env';

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Count SENT outreach records for a business user since start of UTC day. */
export async function countTodaySentLeads(businessUserId: string): Promise<number> {
  return db.needLeadOutreach.count({
    where: {
      businessUserId,
      status: 'SENT',
      createdAt: { gte: startOfTodayUtc() },
    },
  });
}

export async function isUnderDailyCap(businessUserId: string): Promise<boolean> {
  const cap = getLeadDailyCapPerBusiness();
  const count = await countTodaySentLeads(businessUserId);
  return count < cap;
}
