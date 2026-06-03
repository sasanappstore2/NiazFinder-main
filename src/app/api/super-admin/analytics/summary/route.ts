import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange, percentChange } from '@/lib/analytics/query-utils';

export const runtime = 'nodejs';

const BOUNCE_MAX_DURATION_MS = 10_000;

async function computeKpis(from: Date, to: Date) {
  const [sessions, pageViews, events, avgDuration, sessionVisitors] = await Promise.all([
    db.analyticsSession.count({
      where: { firstSeen: { gte: from, lte: to } },
    }),
    db.analyticsEvent.count({
      where: { type: 'page_view', createdAt: { gte: from, lte: to } },
    }),
    db.analyticsEvent.count({
      where: { type: 'event', createdAt: { gte: from, lte: to } },
    }),
    db.analyticsSession.aggregate({
      where: { firstSeen: { gte: from, lte: to } },
      _avg: { totalDurationMs: true, pageViewCount: true },
    }),
    db.analyticsSession.groupBy({
      by: ['visitorId'],
      where: { firstSeen: { gte: from, lte: to } },
    }),
  ]);

  const bounceSessions = await db.analyticsSession.count({
    where: {
      firstSeen: { gte: from, lte: to },
      pageViewCount: { lte: 1 },
      totalDurationMs: { lte: BOUNCE_MAX_DURATION_MS },
    },
  });

  const uniqueVisitors = sessionVisitors.length;
  const bounceRate = sessions ? Math.round((bounceSessions / sessions) * 100) : 0;

  const visitorIds = sessionVisitors.map((v) => v.visitorId);
  let newVisitors = 0;
  let returningVisitors = 0;

  if (visitorIds.length > 0) {
    const priorVisitors = await db.analyticsSession.groupBy({
      by: ['visitorId'],
      where: {
        visitorId: { in: visitorIds },
        firstSeen: { lt: from },
      },
    });
    const priorSet = new Set(priorVisitors.map((v) => v.visitorId));
    for (const id of visitorIds) {
      if (priorSet.has(id)) returningVisitors += 1;
      else newVisitors += 1;
    }
  }

  const conversionEvents = await db.analyticsEvent.count({
    where: {
      type: 'event',
      name: { in: ['signup_completed', 'need_created', 'proposal_sent', 'chat_started'] },
      createdAt: { gte: from, lte: to },
    },
  });
  const conversionRate = sessions ? Math.round((conversionEvents / sessions) * 1000) / 10 : 0;

  return {
    sessions,
    pageViews,
    uniqueVisitors,
    events,
    bounceRate,
    avgDurationMs: Math.round(avgDuration._avg.totalDurationMs ?? 0),
    avgPagesPerSession: Number((avgDuration._avg.pageViewCount ?? 0).toFixed(1)),
    newVsReturning: { new: newVisitors, returning: returningVisitors },
    conversionRate,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);
    const { from, to, compareFrom, compareTo } = range;
    const market = request.nextUrl.searchParams.get('market');

    const kpis = await computeKpis(from, to);

    let compare: Record<string, number | null> | undefined;
    if (compareFrom && compareTo) {
      const prev = await computeKpis(compareFrom, compareTo);
      compare = {
        sessions: percentChange(kpis.sessions, prev.sessions),
        pageViews: percentChange(kpis.pageViews, prev.pageViews),
        uniqueVisitors: percentChange(kpis.uniqueVisitors, prev.uniqueVisitors),
        bounceRate: percentChange(kpis.bounceRate, prev.bounceRate),
        conversionRate: percentChange(kpis.conversionRate, prev.conversionRate),
      };
    }

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString(), preset: range.preset },
      market: market ?? 'all',
      kpis,
      compare,
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
