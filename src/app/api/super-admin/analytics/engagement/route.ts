import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange, groupByField } from '@/lib/analytics/query-utils';
import type { PageDimensions } from '@/lib/analytics/parse-page-context';

export const runtime = 'nodejs';

const DURATION_BUCKETS = [
  { label: '۰–۱۰ ثانیه', min: 0, max: 10_000 },
  { label: '۱۰–۳۰ ثانیه', min: 10_000, max: 30_000 },
  { label: '۳۰–۶۰ ثانیه', min: 30_000, max: 60_000 },
  { label: '۱–۳ دقیقه', min: 60_000, max: 180_000 },
  { label: '۳+ دقیقه', min: 180_000, max: Infinity },
];

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);

    const pageViews = await db.analyticsEvent.findMany({
      where: { type: 'page_view', createdAt: { gte: range.from, lte: range.to } },
      select: { path: true, durationMs: true, dimensions: true },
    });

    const sessions = await db.analyticsSession.findMany({
      where: { firstSeen: { gte: range.from, lte: range.to } },
      select: { landingPath: true, pageViewCount: true },
    });

    const entrances = groupByField(sessions, (s) => s.landingPath ?? '/').slice(0, 15);

    const exitCounts = new Map<string, number>();
    const bySession = await db.analyticsEvent.findMany({
      where: { type: 'page_view', createdAt: { gte: range.from, lte: range.to } },
      select: { sessionId: true, path: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const lastBySession = new Map<string, string>();
    for (const e of bySession) lastBySession.set(e.sessionId, e.path);
    for (const path of lastBySession.values()) {
      exitCounts.set(path, (exitCounts.get(path) ?? 0) + 1);
    }
    const exits = Array.from(exitCounts.entries())
      .map(([key, value]) => ({ key, label: key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    const durationHistogram = DURATION_BUCKETS.map((b) => ({
      label: b.label,
      value: pageViews.filter((e) => {
        const ms = e.durationMs ?? 0;
        return ms >= b.min && ms < b.max;
      }).length,
    }));

    const pageKindRows = groupByField(pageViews, (e) => {
      const d = (e.dimensions ?? {}) as PageDimensions;
      return d.pageKind ?? '(not set)';
    });

    const avgDurationMs = pageViews.length
      ? Math.round(
          pageViews.reduce((s, e) => s + (e.durationMs ?? 0), 0) / pageViews.length
        )
      : 0;

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      entrances,
      exits,
      durationHistogram,
      pageKind: pageKindRows.slice(0, 12),
      avgDurationMs,
      totalPageViews: pageViews.length,
    });
  } catch (error) {
    console.error('Analytics engagement error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
