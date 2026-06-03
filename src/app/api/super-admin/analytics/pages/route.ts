import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { parseDateRange, groupByField } from '@/lib/analytics/query-utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const range = parseDateRange(request.nextUrl.searchParams);

    const events = await db.analyticsEvent.findMany({
      where: { type: 'page_view', createdAt: { gte: range.from, lte: range.to } },
      select: { path: true, title: true, durationMs: true },
    });

    const byPath = new Map<string, { path: string; title: string | null; views: number; totalDuration: number }>();
    for (const e of events) {
      const cur = byPath.get(e.path) ?? { path: e.path, title: e.title, views: 0, totalDuration: 0 };
      cur.views += 1;
      cur.totalDuration += e.durationMs ?? 0;
      if (e.title && !cur.title) cur.title = e.title;
      byPath.set(e.path, cur);
    }

    const rows = Array.from(byPath.values())
      .map((r) => ({
        path: r.path,
        title: r.title,
        views: r.views,
        avgDurationMs: r.views ? Math.round(r.totalDuration / r.views) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 100);

    const visitors = groupByField(events, () => 'all');

    return NextResponse.json({
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      totalPageViews: events.length,
      uniquePaths: byPath.size,
      rows,
      note: visitors.length ? undefined : undefined,
    });
  } catch (error) {
    console.error('Analytics pages error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
