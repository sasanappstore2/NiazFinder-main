import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';
import {
  hasRollupCoverage,
  queryRollupTimeline,
  splitRollupRange,
} from '@/lib/analytics/query-rollup';

export const runtime = 'nodejs';

type Metric = 'sessions' | 'pageViews' | 'events';

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(
    new Date(`${dateStr}T12:00:00.000Z`)
  );
}

async function rawTimeline(from: Date, to: Date, metric: Metric) {
  const buckets = new Map<string, number>();
  const cursor = new Date(from);
  while (cursor <= to) {
    buckets.set(dayKey(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  if (metric === 'sessions') {
    const sessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: from, lte: to } },
      select: { firstSeen: true },
    });
    for (const s of sessions) {
      const k = dayKey(s.firstSeen);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
  } else {
    const type = metric === 'pageViews' ? 'page_view' : 'event';
    const events = await db.analyticsEvent.findMany({
      where: { type, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    });
    for (const e of events) {
      const k = dayKey(e.createdAt);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
  }

  return buckets;
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const metric = (request.nextUrl.searchParams.get('metric') ?? 'pageViews') as Metric;

    const buckets = new Map<string, number>();
    const cursor = new Date(range.from);
    while (cursor <= range.to) {
      buckets.set(dayKey(cursor), 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    const split = splitRollupRange(range.from, range.to);
    let source: 'rollup' | 'raw' | 'hybrid' = 'raw';

    if (split && (await hasRollupCoverage(split.rollupFrom, split.rollupTo))) {
      source = split.rawFrom ? 'hybrid' : 'rollup';
      const rollupPoints = await queryRollupTimeline(split.rollupFrom, split.rollupTo, metric);
      for (const p of rollupPoints) {
        if (buckets.has(p.date)) buckets.set(p.date, p.value);
      }
      if (split.rawFrom && split.rawTo) {
        const raw = await rawTimeline(split.rawFrom, split.rawTo, metric);
        for (const [k, v] of raw) buckets.set(k, v);
      }
    } else {
      const raw = await rawTimeline(range.from, range.to, metric);
      for (const [k, v] of raw) buckets.set(k, v);
    }

    const points = Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      label: formatLabel(date),
      value,
    }));

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      metric,
      source,
      points,
    });
  } catch (error) {
    console.error('Analytics timeline error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
