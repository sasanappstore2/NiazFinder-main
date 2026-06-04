import { db } from '@/lib/db';

export async function rollupBusinessAnalyticsForDate(profileId: string, date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const profile = await db.businessProfile.findUnique({
    where: { id: profileId },
    select: { viewCount: true, clickCount: true, conversionCount: true, saveCount: true },
  });
  if (!profile) return null;

  return db.businessAnalyticsDaily.upsert({
    where: { profileId_date: { profileId, date: start } },
    create: {
      profileId,
      date: start,
      views: profile.viewCount,
      clicks: profile.clickCount,
      conversions: profile.conversionCount,
      saves: profile.saveCount,
    },
    update: {
      views: profile.viewCount,
      clicks: profile.clickCount,
      conversions: profile.conversionCount,
      saves: profile.saveCount,
    },
  });
}

export async function listBusinessAnalyticsSeries(profileId: string, days = 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);
  return db.businessAnalyticsDaily.findMany({
    where: { profileId, date: { gte: since } },
    orderBy: { date: 'asc' },
  });
}
