/**
 * Aggregate AnalyticsEvent rows into AnalyticsDailyRollup for a given UTC date.
 *
 * Usage: npx tsx scripts/analytics/rollup-daily.ts [YYYY-MM-DD]
 *        npx tsx scripts/analytics/rollup-daily.ts --backfill 7
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function dayBounds(dateStr?: string) {
  const base = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date();
  base.setUTCHours(0, 0, 0, 0);
  if (!dateStr) base.setUTCDate(base.getUTCDate() - 1);
  const end = new Date(base);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: base, end };
}

async function upsertRollup(
  date: Date,
  dimensionKey: string,
  dimensionValue: string,
  data: {
    sessions: number;
    pageViews: number;
    uniqueVisitors: number;
    events: number;
    avgDurationMs: number;
  }
) {
  await db.analyticsDailyRollup.upsert({
    where: {
      date_dimensionKey_dimensionValue: {
        date,
        dimensionKey,
        dimensionValue,
      },
    },
    create: { date, dimensionKey, dimensionValue, ...data },
    update: data,
  });
}

async function rollupDay(start: Date, end: Date) {
  const [sessions, pageViews, events, visitors, durationAgg] = await Promise.all([
    db.analyticsSession.count({ where: { firstSeen: { gte: start, lt: end } } }),
    db.analyticsEvent.count({
      where: { type: 'page_view', createdAt: { gte: start, lt: end } },
    }),
    db.analyticsEvent.count({
      where: { type: 'event', createdAt: { gte: start, lt: end } },
    }),
    db.analyticsSession.groupBy({
      by: ['visitorId'],
      where: { firstSeen: { gte: start, lt: end } },
    }),
    db.analyticsSession.aggregate({
      where: { firstSeen: { gte: start, lt: end } },
      _avg: { totalDurationMs: true },
    }),
  ]);

  await upsertRollup(start, '_total', '_all', {
    sessions,
    pageViews,
    uniqueVisitors: visitors.length,
    events,
    avgDurationMs: Math.round(durationAgg._avg.totalDurationMs ?? 0),
  });

  const pageViewEvents = await db.analyticsEvent.findMany({
    where: { type: 'page_view', createdAt: { gte: start, lt: end } },
    select: { dimensions: true, province: true, city: true },
  });

  const sessionRows = await db.analyticsSession.findMany({
    where: { firstSeen: { gte: start, lt: end } },
    select: { utmSource: true, utmMedium: true, device: true, browser: true, province: true },
  });

  const dimCounts = new Map<string, Map<string, { sessions: number; pageViews: number }>>();

  const bump = (key: string, val: string, field: 'sessions' | 'pageViews', n = 1) => {
    if (!dimCounts.has(key)) dimCounts.set(key, new Map());
    const inner = dimCounts.get(key)!;
    const cur = inner.get(val) ?? { sessions: 0, pageViews: 0 };
    cur[field] += n;
    inner.set(val, cur);
  };

  for (const s of sessionRows) {
    const channel = s.utmMedium?.includes('cpc') ? 'paid' : s.utmSource ? 'referral' : 'direct';
    bump('channel', channel, 'sessions');
    if (s.province) bump('province', s.province, 'sessions');
    if (s.device) bump('device', s.device, 'sessions');
    if (s.browser) bump('browser', s.browser, 'sessions');
  }

  for (const e of pageViewEvents) {
    const d = (e.dimensions ?? {}) as Record<string, string | undefined>;
    for (const [key, val] of Object.entries(d)) {
      if (val) bump(key, val, 'pageViews');
    }
    if (e.province) bump('province', e.province, 'pageViews');
    if (e.city) bump('citySlug', e.city, 'pageViews');
  }

  for (const [dimKey, values] of dimCounts) {
    for (const [dimVal, counts] of values) {
      await upsertRollup(start, dimKey, dimVal, {
        sessions: counts.sessions,
        pageViews: counts.pageViews,
        uniqueVisitors: 0,
        events: 0,
        avgDurationMs: 0,
      });
    }
  }

  console.log(`Rollup complete for ${start.toISOString().slice(0, 10)}`, {
    sessions,
    pageViews,
    uniqueVisitors: visitors.length,
    events,
  });
}

async function main() {
  const backfillIdx = process.argv.indexOf('--backfill');
  if (backfillIdx >= 0) {
    const days = Number(process.argv[backfillIdx + 1] ?? 7);
    for (let i = days; i >= 1; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setUTCDate(end.getUTCDate() + 1);
      await rollupDay(d, end);
    }
    return;
  }

  const dateArg = process.argv[2];
  const { start, end } = dayBounds(dateArg);
  await rollupDay(start, end);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
