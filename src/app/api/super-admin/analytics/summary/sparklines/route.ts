import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange } from '@/lib/analytics/query-utils';

export const runtime = 'nodejs';

type SparkMetric = 'sessions' | 'pageViews' | 'uniqueVisitors' | 'bounceRate' | 'conversionRate';

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(
    new Date(`${dateStr}T12:00:00.000Z`)
  );
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const metricsParam = request.nextUrl.searchParams.get('metrics') ?? 'sessions,pageViews';
    const metrics = metricsParam.split(',').map((m) => m.trim()) as SparkMetric[];

    const buckets = new Map<
      string,
      { sessions: number; pageViews: number; visitors: Set<string>; bounce: number; conversions: number }
    >();

    const cursor = new Date(range.from);
    while (cursor <= range.to) {
      buckets.set(dayKey(cursor), {
        sessions: 0,
        pageViews: 0,
        visitors: new Set(),
        bounce: 0,
        conversions: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const [sessions, pageViews, events] = await Promise.all([
      db.analyticsSession.findMany({
        where: { firstSeen: { gte: range.from, lte: range.to } },
        select: {
          firstSeen: true,
          visitorId: true,
          pageViewCount: true,
          totalDurationMs: true,
        },
      }),
      db.analyticsEvent.findMany({
        where: { type: 'page_view', createdAt: { gte: range.from, lte: range.to } },
        select: { createdAt: true },
      }),
      db.analyticsEvent.findMany({
        where: {
          type: 'event',
          name: { in: ['signup_completed', 'need_created', 'proposal_sent', 'chat_started'] },
          createdAt: { gte: range.from, lte: range.to },
        },
        select: { createdAt: true },
      }),
    ]);

    for (const s of sessions) {
      const k = dayKey(s.firstSeen);
      const b = buckets.get(k);
      if (!b) continue;
      b.sessions += 1;
      b.visitors.add(s.visitorId);
      if (s.pageViewCount <= 1 && s.totalDurationMs <= 10_000) b.bounce += 1;
    }

    for (const e of pageViews) {
      const k = dayKey(e.createdAt);
      const b = buckets.get(k);
      if (b) b.pageViews += 1;
    }

    for (const e of events) {
      const k = dayKey(e.createdAt);
      const b = buckets.get(k);
      if (b) b.conversions += 1;
    }

    const series: Record<string, Array<{ date: string; label: string; value: number }>> = {};

    for (const metric of metrics) {
      series[metric] = Array.from(buckets.entries()).map(([date, b]) => {
        let value = 0;
        if (metric === 'sessions') value = b.sessions;
        else if (metric === 'pageViews') value = b.pageViews;
        else if (metric === 'uniqueVisitors') value = b.visitors.size;
        else if (metric === 'bounceRate') value = b.sessions ? Math.round((b.bounce / b.sessions) * 100) : 0;
        else if (metric === 'conversionRate')
          value = b.sessions ? Math.round((b.conversions / b.sessions) * 1000) / 10 : 0;
        return { date, label: formatLabel(date), value };
      });
    }

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      series,
    });
  } catch (error) {
    console.error('Analytics sparklines error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
