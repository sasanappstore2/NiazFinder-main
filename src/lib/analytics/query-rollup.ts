import { db } from '@/lib/db';
import { cityProvinceId } from '@/lib/analytics/geo-location-index';

/** Days before today that still use raw events (today + yesterday). */
export const ROLLUP_RAW_TAIL_DAYS = 2;

export type RollupSplit = {
  rollupFrom: Date;
  rollupTo: Date;
  rawFrom: Date | null;
  rawTo: Date | null;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/** Split a query range into rollup-eligible days vs raw tail. */
export function splitRollupRange(from: Date, to: Date): RollupSplit | null {
  const cutoff = startOfUtcDay(new Date());
  cutoff.setUTCDate(cutoff.getUTCDate() - ROLLUP_RAW_TAIL_DAYS);

  if (from >= cutoff) return null;

  const rollupTo = to < cutoff ? endOfUtcDay(to) : new Date(cutoff.getTime() - 1);
  const rawFrom = to >= cutoff ? cutoff : null;
  const rawTo = rawFrom ? to : null;

  return { rollupFrom: startOfUtcDay(from), rollupTo, rawFrom, rawTo };
}

export async function hasRollupCoverage(from: Date, to: Date): Promise<boolean> {
  const count = await db.analyticsDailyRollup.count({
    where: {
      dimensionKey: '_total',
      dimensionValue: '_all',
      date: { gte: startOfUtcDay(from), lte: endOfUtcDay(to) },
    },
  });
  return count > 0;
}

export async function queryRollupTotals(from: Date, to: Date) {
  const rows = await db.analyticsDailyRollup.findMany({
    where: {
      dimensionKey: '_total',
      dimensionValue: '_all',
      date: { gte: startOfUtcDay(from), lte: endOfUtcDay(to) },
    },
  });

  let sessions = 0;
  let pageViews = 0;
  let uniqueVisitors = 0;
  let events = 0;
  let durationSum = 0;
  let durationDays = 0;

  for (const r of rows) {
    sessions += r.sessions;
    pageViews += r.pageViews;
    uniqueVisitors += r.uniqueVisitors;
    events += r.events;
    if (r.avgDurationMs) {
      durationSum += r.avgDurationMs;
      durationDays += 1;
    }
  }

  return {
    sessions,
    pageViews,
    uniqueVisitors,
    events,
    avgDurationMs: durationDays ? Math.round(durationSum / durationDays) : 0,
  };
}

export async function queryRollupTimeline(
  from: Date,
  to: Date,
  metric: 'sessions' | 'pageViews' | 'events'
) {
  const field = metric === 'sessions' ? 'sessions' : metric === 'pageViews' ? 'pageViews' : 'events';
  const rows = await db.analyticsDailyRollup.findMany({
    where: {
      dimensionKey: '_total',
      dimensionValue: '_all',
      date: { gte: startOfUtcDay(from), lte: endOfUtcDay(to) },
    },
    orderBy: { date: 'asc' },
  });

  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    value: r[field],
  }));
}

export async function queryRollupDimensions(from: Date, to: Date, dimensionKey: string) {
  const rows = await db.analyticsDailyRollup.findMany({
    where: {
      dimensionKey,
      dimensionValue: { not: '_all' },
      date: { gte: startOfUtcDay(from), lte: endOfUtcDay(to) },
    },
  });

  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.dimensionValue, (map.get(r.dimensionValue) ?? 0) + r.pageViews);
  }

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

export async function queryRollupGeo(
  from: Date,
  to: Date,
  level: 'province' | 'city',
  provinceFilter?: string | null
) {
  const dimKey = level === 'city' ? 'city' : 'province';
  const rows = await db.analyticsDailyRollup.findMany({
    where: {
      dimensionKey: dimKey,
      dimensionValue: { not: '_all' },
      date: { gte: startOfUtcDay(from), lte: endOfUtcDay(to) },
    },
  });

  const map = new Map<string, number>();
  for (const r of rows) {
    if (provinceFilter && level === 'city') {
      if (cityProvinceId(r.dimensionValue) !== provinceFilter) continue;
    }
    map.set(r.dimensionValue, (map.get(r.dimensionValue) ?? 0) + r.pageViews);
  }

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}
